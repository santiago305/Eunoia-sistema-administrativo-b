import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, Optional } from "@nestjs/common";
import { createHash } from "crypto";
import { AccessControlService } from "src/modules/access-control/application/services/access-control.service";
import { SaleOrderPaymentWorkflowReconciliationService } from "src/modules/sale-orders/application/services/sale-order-payment-workflow-reconciliation.service";
import { fromMinorUnits, toMinorUnits } from "src/modules/sale-orders/domain/value-objects/money";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { SALE_ORDER_REPOSITORY, SaleOrderRepository } from "src/modules/sale-orders/domain/ports/sale-order.repository";
import { CLIENT_REPOSITORY, ClientRepository } from "src/modules/clients/domain/ports/client.repository";
import { ClientType } from "src/modules/clients/domain/object-values/client-type";
import { SaleOrderWorkflowTransitionService } from "src/modules/workflow/application/services/sale-order-workflow-transition.service";
import { TRANSITION_PURPOSES } from "src/modules/workflow/domain/constants/workflow-transition-purpose.constants";
import { SALE_PAYMENT_REPOSITORY, SalePaymentRepository } from "src/modules/sale-orders/domain/ports/sale-payment.repository";

type PaymentResolution = {
  incomeId: string;
  action: "CANCEL_PENDING" | "TRANSFER_PENDING" | "KEEP_AS_CREDIT" | "APPLY_TO_ORDER" | "REFUND";
  reason: string;
  targetSaleOrderId?: string;
  amount?: number;
};

type CancellationTarget = {
  id: string;
  client_id: string;
  currency: string;
  total: string | number;
  is_active: boolean;
  state_code: string;
};

@Injectable()
export class CancelSaleOrderUsecase {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(SALE_ORDER_REPOSITORY)
    private readonly saleOrderRepo: SaleOrderRepository,
    @Inject(CLIENT_REPOSITORY)
    private readonly clientRepo: ClientRepository,
    private readonly workflowTransitionService: SaleOrderWorkflowTransitionService,
    @Inject(SALE_PAYMENT_REPOSITORY) private readonly paymentRepo: SalePaymentRepository,
    @Optional() private readonly accessControl?: AccessControlService,
    @Optional() private readonly paymentWorkflowReconciliation?: SaleOrderPaymentWorkflowReconciliationService,
  ) {}

  async execute(input: { saleOrderId: string; userId?: string; idempotencyKey?: string; resolutions?: PaymentResolution[] }) {
    return this.uow.runInTransaction(async (tx) => {
      const manager = (tx as any)?.manager;
      if (!manager?.query) throw new Error("No se pudo abrir la transaccion financiera del pedido.");
      const [identity] = await manager.query(`SELECT client_id FROM sale_orders WHERE id = $1`, [input.saleOrderId]);
      if (!identity) throw new BadRequestException("Pedido no encontrado");
      await manager.query(`SELECT id FROM clients WHERE id = $1 FOR UPDATE`, [identity.client_id]);
      const order = await this.saleOrderRepo.findByIdForUpdate(input.saleOrderId, tx);
      if (!order) throw new BadRequestException("Pedido no encontrado");
      if (order.clientId !== identity.client_id) throw new ConflictException("El cliente del pedido cambió durante la operación; vuelve a intentarlo.");
      const activePayments = await manager.query(
        `SELECT id, sale_order_id, amount, currency, status, version, company_payment_account_id
         FROM sale_payments
         WHERE sale_order_id = $1 AND status IN ('PENDING_CONFIRMATION','POSTED')
         ORDER BY id FOR UPDATE`,
        [order.id],
      );
      let emptyCancellationScope: string | null = null;
      if (!activePayments.length && input.userId && input.idempotencyKey) {
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.idempotencyKey)) {
          throw new BadRequestException("Envía una clave de idempotencia válida para cancelar el pedido.");
        }
        const resolutions = [...(input.resolutions ?? [])].sort((a, b) => a.incomeId.localeCompare(b.incomeId));
        const scope = `cancel-order:${input.userId}:${order.id}`;
        const requestHash = createHash("sha256").update(JSON.stringify({ saleOrderId: order.id, resolutions })).digest("hex");
        const findPrior = async () => {
          const [prior] = await manager.query(
            `SELECT request_hash, status, response_body FROM financial_idempotency_records
             WHERE scope_key = $1 AND idempotency_key = $2::uuid FOR UPDATE`,
            [scope, input.idempotencyKey],
          );
          if (!prior) return null;
          if (prior.request_hash !== requestHash) throw new ConflictException({ code: "IDEMPOTENCY_KEY_REUSED", message: "La clave de idempotencia ya se usó con otra solicitud." });
          if (prior.status === "COMPLETED") return prior.response_body;
          throw new ConflictException({ code: "OPERATION_IN_PROGRESS", message: "La cancelación sigue en curso; consulta nuevamente." });
        };
        const replay = await findPrior();
        if (replay) return replay;
        if (resolutions.length) {
          throw new ConflictException({ code: "PAYMENT_RESOLUTION_SET_MISMATCH", message: "El pedido ya no tiene ingresos activos para resolver; actualiza la lista e inténtalo otra vez." });
        }
        const inserted = await manager.query(
          `INSERT INTO financial_idempotency_records (scope_key, idempotency_key, request_hash, status)
           VALUES ($1, $2::uuid, $3, 'IN_PROGRESS') ON CONFLICT (scope_key, idempotency_key) DO NOTHING RETURNING id`,
          [scope, input.idempotencyKey, requestHash],
        );
        if (!inserted.length) {
          const concurrentReplay = await findPrior();
          if (concurrentReplay) return concurrentReplay;
        }
        emptyCancellationScope = scope;
      }
      const resolutionResult = activePayments.length
        ? await this.resolvePaymentSet(input, order, activePayments, tx, manager)
        : null;
      if (resolutionResult && "replayed" in resolutionResult) return resolutionResult.result;

      const updated = await this.workflowTransitionService.advance(
        {
          saleOrderId: order.id,
          executedBy: input.userId ?? order.createdBy,
          transitionPurpose: TRANSITION_PURPOSES.CANCEL,
          metadata: { source: "cancel.usecase" },
          financialCancellationResolved: true,
        },
        tx,
      );
      const deliveredOrdersCount = await this.saleOrderRepo.countSaleOrdersByClientId(order.clientId, tx);
      const type =
        deliveredOrdersCount === 0
          ? ClientType.LAGGING
          : deliveredOrdersCount === 1
            ? ClientType.NEW
            : ClientType.REPURCHASE;
      await this.clientRepo.update({ clientId: order.clientId, type }, tx);

      const result = { saleOrderId: order.id, currentStateId: updated.order.currentStateId };
      if (emptyCancellationScope && input.userId) {
        await manager.query(
          `INSERT INTO sale_order_auditory (sale_order_id, executed_by, action_execution)
           VALUES ($1, $2, 'sale_order_cancelled_without_payments')`,
          [order.id, input.userId],
        );
        await manager.query(
          `INSERT INTO financial_outbox_events (event_type, aggregate_type, aggregate_id, payload)
           VALUES ('sale_order.cancelled', 'sale_order', $1, $2::jsonb)`,
          [order.id, JSON.stringify({ saleOrderId: order.id, actorId: input.userId })],
        );
      }
      const idempotencyScope = resolutionResult && "scope" in resolutionResult ? resolutionResult.scope : emptyCancellationScope;
      if (idempotencyScope) {
        await manager.query(
          `UPDATE financial_idempotency_records SET status = 'COMPLETED', response_status = 200,
             response_body = $2::jsonb, completed_at = now() WHERE scope_key = $1 AND idempotency_key = $3::uuid`,
          [idempotencyScope, JSON.stringify(result), input.idempotencyKey],
        );
      }
      return result;
    });
  }

  private async resolvePaymentSet(input: { saleOrderId: string; userId?: string; idempotencyKey?: string; resolutions?: PaymentResolution[] }, order: any, payments: any[], tx: any, manager: any): Promise<{ scope: string } | { replayed: true; result: any }> {
    const userId = input.userId;
    if (!userId) throw new ForbiddenException("Se requiere identificar al usuario que resuelve los pagos del pedido.");
    if (!input.idempotencyKey || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.idempotencyKey)) {
      throw new BadRequestException("Envía una clave de idempotencia válida para resolver pagos.");
    }
    const resolutions = [...(input.resolutions ?? [])].sort((a, b) => a.incomeId.localeCompare(b.incomeId));
    const byIncomeId = new Map(resolutions.map((resolution) => [resolution.incomeId, resolution]));
    if (!this.accessControl) throw new ForbiddenException("No está configurada la autorización para resolver pagos.");
    const permissions = await this.accessControl.getEffectivePermissions(userId);
    const has = (permission: string) => permissions.includes("*") || permissions.includes(permission);
    if (!has("sale_orders.payments.resolve_cancelled_order")) throw new ForbiddenException("No tienes permiso para resolver los pagos al cancelar el pedido.");

    const request = { saleOrderId: order.id, resolutions };
    const requestHash = createHash("sha256").update(JSON.stringify(request)).digest("hex");
    const scope = `cancel-order:${userId}:${order.id}`;
    const inserted = await manager.query(
      `INSERT INTO financial_idempotency_records (scope_key, idempotency_key, request_hash, status)
       VALUES ($1, $2::uuid, $3, 'IN_PROGRESS')
       ON CONFLICT (scope_key, idempotency_key) DO NOTHING RETURNING id`,
      [scope, input.idempotencyKey, requestHash],
    );
    if (!inserted.length) {
      const [prior] = await manager.query(
        `SELECT request_hash, status, response_body FROM financial_idempotency_records
         WHERE scope_key = $1 AND idempotency_key = $2::uuid FOR UPDATE`,
        [scope, input.idempotencyKey],
      );
      if (!prior || prior.request_hash !== requestHash) throw new ConflictException({ code: "IDEMPOTENCY_KEY_REUSED", message: "La clave de idempotencia ya se usó con otra solicitud." });
      if (prior.status === "COMPLETED") return { replayed: true, result: prior.response_body };
      throw new ConflictException({ code: "OPERATION_IN_PROGRESS", message: "La cancelación sigue en curso; consulta nuevamente." });
    }
    // Check for a completed replay before validating the current active payment set.
    // A successful cancellation can legitimately change that set (e.g. a pending
    // income is cancelled while a posted one remains active), but the same command
    // must still return its original result after the browser loses the response.
    if (byIncomeId.size !== resolutions.length || payments.length !== resolutions.length || payments.some((payment) => !byIncomeId.has(payment.id))) {
      throw new ConflictException({ code: "PAYMENT_RESOLUTION_SET_MISMATCH", message: "Debes resolver exactamente todos los ingresos activos del pedido; actualiza la lista e inténtalo otra vez." });
    }

    const targetIds = [...new Set(resolutions.filter((item) => item.action === "APPLY_TO_ORDER" || item.action === "TRANSFER_PENDING").map((item) => item.targetSaleOrderId).filter(Boolean))] as string[];
    const targets: CancellationTarget[] = targetIds.length ? await manager.query(
      `SELECT so.id, so.client_id, so.currency, so.total, so.is_active,
              UPPER(COALESCE(sos.code, '')) AS state_code
       FROM sale_orders so
       LEFT JOIN workflow_states ws ON ws.id = so.current_state_id
       LEFT JOIN sale_order_states sos ON sos.id = ws.sale_order_state_id
       WHERE so.id = ANY($1::uuid[]) ORDER BY so.id FOR UPDATE OF so`,
      [targetIds],
    ) : [];
    const targetById = new Map<string, CancellationTarget>(targets.map((target) => [target.id, target]));
    const movedByTarget = new Map<string, number>();

    for (const payment of payments) {
      const resolution = byIncomeId.get(payment.id)!;
      const reason = resolution.reason?.trim() ?? "";
      if (reason.length < 5 || reason.length > 500) throw new BadRequestException("Cada motivo debe tener entre 5 y 500 caracteres.");
      const paymentAmount = toMinorUnits(payment.amount);
      if (payment.status === "PENDING_CONFIRMATION") {
        if (resolution.action === "CANCEL_PENDING") {
          await manager.query(
            `UPDATE sale_payments SET status = 'CANCELLED', cancelled_at = now(), cancelled_by_user_id = $2,
               voided_at = now(), voided_by_user_id = $2, void_reason = $3, financial_reason = $3, version = version + 1
             WHERE id = $1 AND status = 'PENDING_CONFIRMATION'`,
            [payment.id, userId, reason],
          );
          await this.writeFinancialAudit(manager, order.id, userId, "payment_cancelled_for_order_cancellation", payment.id, { reason });
          continue;
        }
        if (resolution.action !== "TRANSFER_PENDING" || !has("sale_orders.payments.transfer_pending")) {
          throw new ConflictException({ code: "PENDING_PAYMENT_RESOLUTION_INVALID", message: "El ingreso por confirmar debe cancelarse o transferirse con su permiso correspondiente." });
        }
        const target = resolution.targetSaleOrderId ? targetById.get(resolution.targetSaleOrderId) : undefined;
        if (!target || target.id === order.id || target.client_id !== order.clientId || target.currency !== payment.currency || !target.is_active || target.state_code === "CANCELLED") {
          throw new ConflictException({ code: "PENDING_TRANSFER_TARGET_INVALID", message: "El pedido destino debe estar activo y ser del mismo cliente y moneda." });
        }
        const capacityRows = await manager.query(
          `SELECT COALESCE((SELECT SUM(spa.amount) FROM sale_payment_allocations spa
              JOIN sale_payments sp ON sp.id = spa.sale_payment_id WHERE spa.sale_order_id = $1 AND sp.status = 'POSTED'), 0)
             + COALESCE((SELECT SUM(sp.amount) FROM sale_payments sp WHERE sp.sale_order_id = $1
              AND sp.status = 'PENDING_CONFIRMATION'), 0) AS reserved`,
          [target.id],
        );
        const alreadyMoved = movedByTarget.get(target.id) ?? 0;
        const remaining = toMinorUnits(target.total) - toMinorUnits(capacityRows[0]?.reserved ?? 0) - alreadyMoved;
        if (paymentAmount > remaining) throw new ConflictException({ code: "TRANSFER_EXCEEDS_ORDER_BALANCE", message: "El importe supera el saldo disponible del pedido destino.", available: fromMinorUnits(Math.max(remaining, 0)), currency: target.currency });
        await manager.query(
          `UPDATE sale_payments SET sale_order_id = $2, updated_by_user_id = $3, financial_reason = $4, version = version + 1
           WHERE id = $1 AND status = 'PENDING_CONFIRMATION'`,
          [payment.id, target.id, userId, reason],
        );
        movedByTarget.set(target.id, alreadyMoved + paymentAmount);
        await this.writeFinancialAudit(manager, order.id, userId, "payment_transferred_during_order_cancellation", payment.id, { reason, targetSaleOrderId: target.id });
        await this.writeFinancialAudit(manager, target.id, userId, "payment_received_from_cancelled_order", payment.id, { reason, sourceSaleOrderId: order.id });
        continue;
      }

      if (!["KEEP_AS_CREDIT", "APPLY_TO_ORDER", "REFUND"].includes(resolution.action)) {
        throw new ConflictException({ code: "POSTED_PAYMENT_RESOLUTION_INVALID", message: "El ingreso contabilizado debe mantenerse como saldo, aplicarse a otro pedido o reembolsarse." });
      }
      if (resolution.action === "REFUND" && !has("customer_refunds.create")) throw new ForbiddenException("Se requiere el permiso para registrar reembolsos.");
      if (resolution.action === "APPLY_TO_ORDER" && !has("customer_credits.apply")) throw new ForbiddenException("Se requiere el permiso para aplicar el saldo a otro pedido.");

      const allocationRows = await manager.query(
        `SELECT COALESCE(SUM(amount), 0)::numeric(14,2) AS amount FROM sale_payment_allocations
         WHERE sale_payment_id = $1 AND sale_order_id = $2`,
        [payment.id, order.id],
      );
      const appliedCents = Math.max(toMinorUnits(allocationRows[0]?.amount ?? 0), 0);
      const creditRows = await manager.query(
        `SELECT COALESCE(SUM(amount), 0)::numeric(14,2) AS amount FROM customer_credit_movements WHERE sale_payment_id = $1`,
        [payment.id],
      );
      const existingCreditCents = Math.max(toMinorUnits(creditRows[0]?.amount ?? 0), 0);
      if (appliedCents > 0) {
        await manager.query(
          `INSERT INTO sale_payment_allocations (sale_payment_id, sale_order_id, amount, currency, created_by_user_id)
           VALUES ($1, $2, $3, $4::currency_type, $5)`,
          [payment.id, order.id, fromMinorUnits(-appliedCents), payment.currency, userId],
        );
        await manager.query(
          `INSERT INTO customer_credit_movements
            (client_id, sale_payment_id, source_sale_order_id, movement_type, amount, currency, created_by_user_id, reason)
           VALUES ($1, $2, $3, 'RELEASE', $4, $5::currency_type, $6, $7)`,
          [order.clientId, payment.id, order.id, fromMinorUnits(appliedCents), payment.currency, userId, reason],
        );
      }
      const resolvedCreditCents = existingCreditCents + appliedCents;
      const requestedCents = resolution.action === "KEEP_AS_CREDIT" ? appliedCents
        : resolution.amount === undefined ? resolvedCreditCents : toMinorUnits(resolution.amount);
      if (requestedCents < 0 || requestedCents > resolvedCreditCents) throw new ConflictException({ code: "INVALID_PAYMENT_RESOLUTION_AMOUNT", message: "El importe supera el saldo liberado de este ingreso.", available: fromMinorUnits(resolvedCreditCents), currency: payment.currency });

      if (resolution.action === "APPLY_TO_ORDER") {
        const target = resolution.targetSaleOrderId ? targetById.get(resolution.targetSaleOrderId) : undefined;
        if (!target || target.id === order.id || target.client_id !== order.clientId || target.currency !== payment.currency || !target.is_active || target.state_code === "CANCELLED") {
          throw new ConflictException({ code: "CREDIT_TARGET_INVALID", message: "El pedido destino debe estar activo y ser del mismo cliente y moneda." });
        }
        const capacityRows = await manager.query(
          `SELECT COALESCE((SELECT SUM(spa.amount) FROM sale_payment_allocations spa
             JOIN sale_payments sp ON sp.id = spa.sale_payment_id WHERE spa.sale_order_id = $1 AND sp.status = 'POSTED'), 0)
             + COALESCE((SELECT SUM(sp.amount) FROM sale_payments sp WHERE sp.sale_order_id = $1
             AND sp.status = 'PENDING_CONFIRMATION'), 0) AS reserved`,
          [target.id],
        );
        const alreadyMoved = movedByTarget.get(target.id) ?? 0;
        const remaining = toMinorUnits(target.total) - toMinorUnits(capacityRows[0]?.reserved ?? 0) - alreadyMoved;
        if (requestedCents <= 0 || requestedCents > remaining) throw new ConflictException({ code: "CREDIT_EXCEEDS_ORDER_BALANCE", message: "El importe supera el saldo pendiente del pedido destino.", available: fromMinorUnits(Math.max(remaining, 0)), currency: target.currency });
        await manager.query(
          `INSERT INTO customer_credit_movements
            (client_id, sale_payment_id, source_sale_order_id, target_sale_order_id, movement_type, amount, currency, created_by_user_id, reason)
           VALUES ($1, $2, $3, $4, 'APPLY', $5, $6::currency_type, $7, $8)`,
          [order.clientId, payment.id, order.id, target.id, fromMinorUnits(-requestedCents), payment.currency, userId, reason],
        );
        await manager.query(
          `INSERT INTO sale_payment_allocations (sale_payment_id, sale_order_id, amount, currency, created_by_user_id)
           VALUES ($1, $2, $3, $4::currency_type, $5)`,
          [payment.id, target.id, fromMinorUnits(requestedCents), payment.currency, userId],
        );
        movedByTarget.set(target.id, alreadyMoved + requestedCents);
      } else if (resolution.action === "REFUND") {
        if (requestedCents <= 0) throw new BadRequestException("El importe del reembolso debe ser mayor que cero.");
        const refund = await manager.query(
          `INSERT INTO customer_refunds
            (sale_payment_id, client_id, amount, currency, status, reason, created_by_user_id)
           VALUES ($1, $2, $3, $4::currency_type, 'PENDING', $5, $6) RETURNING id`,
          [payment.id, order.clientId, fromMinorUnits(requestedCents), payment.currency, reason, userId],
        );
        await manager.query(
          `INSERT INTO customer_credit_movements
            (client_id, sale_payment_id, source_sale_order_id, movement_type, amount, currency, created_by_user_id, reason)
           VALUES ($1, $2, $3, 'REFUND', $4, $5::currency_type, $6, $7)`,
          [order.clientId, payment.id, order.id, fromMinorUnits(-requestedCents), payment.currency, userId, reason],
        );
        await manager.query(
          `INSERT INTO financial_outbox_events (event_type, aggregate_type, aggregate_id, payload)
           VALUES ('income.customer_refund_created', 'customer_refund', $1, $2::jsonb)`,
          [refund[0].id, JSON.stringify({ refundId: refund[0].id, incomeId: payment.id, saleOrderId: order.id, actorId: userId, amount: fromMinorUnits(requestedCents), currency: payment.currency, reason })],
        );
      }
      await this.writeFinancialAudit(manager, order.id, userId, `payment_${resolution.action.toLowerCase()}`, payment.id, { reason, amount: fromMinorUnits(requestedCents), targetSaleOrderId: resolution.targetSaleOrderId });
    }

    for (const targetSaleOrderId of movedByTarget.keys()) {
      await this.paymentWorkflowReconciliation?.reconcile(
        { saleOrderId: targetSaleOrderId, executedBy: userId, source: "cancelled-order-payment-resolution" },
        tx,
      );
    }
    return { scope };
  }

  private async writeFinancialAudit(manager: any, saleOrderId: string, userId: string, action: string, incomeId: string, details: unknown) {
    await manager.query(`INSERT INTO sale_order_auditory (sale_order_id, executed_by, action_execution) VALUES ($1, $2, $3)`, [saleOrderId, userId, action]);
    await manager.query(
      `INSERT INTO financial_outbox_events (event_type, aggregate_type, aggregate_id, payload)
       VALUES ($1, 'sale_payment', $2, $3::jsonb)`,
      [`income.${action}`, incomeId, JSON.stringify({ incomeId, saleOrderId, actorId: userId, details })],
    );
  }
}

