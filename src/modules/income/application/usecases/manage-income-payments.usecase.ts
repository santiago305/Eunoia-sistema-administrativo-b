import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import { InjectEntityManager } from "@nestjs/typeorm";
import { createHash } from "crypto";
import { EntityManager } from "typeorm";
import { AccessControlService } from "src/modules/access-control/application/services/access-control.service";
import { fromMinorUnits, toMinorUnits } from "src/modules/sale-orders/domain/value-objects/money";
import { isCompanyPaymentAccountCompatible } from "src/modules/company-payment-accounts/domain/policies/payment-account-compatibility";
import { SaleOrderPaymentWorkflowReconciliationService } from "src/modules/sale-orders/application/services/sale-order-payment-workflow-reconciliation.service";
import { TypeormTransactionContext } from "src/shared/infrastructure/typeorm/typeorm.transaction-context";

type PaymentRow = {
  id: string;
  sale_order_id: string;
  amount: string | number;
  currency: string;
  status: string;
  payment_date: string;
  date: Date | string;
  method: string;
  operation_number: string | null;
  operation_code: string | null;
  note: string | null;
  company_payment_account_id: string | null;
  payment_method_id: string | null;
  version: number;
  created_by_user_id: string | null;
  updated_by_user_id: string | null;
};

type ExpectedPayment = { id: string; version: number };

@Injectable()
export class ManageIncomePaymentsUsecase {
  constructor(
    @InjectEntityManager() private readonly entityManager: EntityManager,
    private readonly accessControl: AccessControlService,
    @Optional() private readonly paymentWorkflowReconciliation?: SaleOrderPaymentWorkflowReconciliationService,
  ) {}

  async prevalidate(paymentIds: string[], userId: string, expected?: ExpectedPayment[]) {
    const ids = this.normalizeIds(paymentIds);
    if (!ids.length) throw new BadRequestException("Selecciona al menos un ingreso");
    const rows = await this.entityManager.query<PaymentRow[]>(
      `SELECT sp.*, sp.payment_date::text AS payment_date
       FROM sale_payments sp WHERE sp.id = ANY($1::uuid[]) ORDER BY sp.id`,
      [ids],
    );
    const expectedById = new Map((expected ?? []).map((item) => [item.id, item.version]));
    const warnings: Array<{ incomeId: string; code: string; message: string }> = [];
    const errors: Array<{ incomeId: string; code: string; message: string }> = [];
    const totalsByCurrency: Record<string, number> = {};
    const dates = new Set<string>();
    let withEvidence = 0;

    if (rows.length !== ids.length) {
      for (const id of ids.filter((item) => !rows.some((row) => row.id === item))) {
        errors.push({ incomeId: id, code: "INCOME_NOT_FOUND", message: "El ingreso no existe o ya no está disponible." });
      }
    }
    for (const row of rows) {
      dates.add(String(row.payment_date).slice(0, 10));
      const result = await this.validateForPosting(this.entityManager, row, userId, expectedById.get(row.id));
      if (result.error) errors.push({ incomeId: row.id, ...result.error });
      warnings.push(...result.warnings.map((item) => ({ incomeId: row.id, ...item })));
      if (!result.error) totalsByCurrency[row.currency] = fromMinorUnits((totalsByCurrency[row.currency] ? toMinorUnits(totalsByCurrency[row.currency]) : 0) + toMinorUnits(row.amount));
      const evidence = await this.entityManager.query(
        `SELECT 1 FROM sale_order_attachments WHERE sale_order_payment_id = $1 AND type IN ('PAYMENT_PROOF','SALE_PAYMENT_PROOF') AND deleted_at IS NULL LIMIT 1`,
        [row.id],
      );
      if (evidence.length) withEvidence += 1;
    }
    if (dates.size > 1) errors.push({ incomeId: ids[0], code: "BATCH_DATE_MISMATCH", message: "Todos los ingresos del lote deben tener la misma fecha de pago." });
    const paymentDate = dates.size === 1 ? [...dates][0] : null;
    return {
      paymentDate,
      count: rows.length,
      withEvidence,
      withoutEvidence: Math.max(rows.length - withEvidence, 0),
      totalsByCurrency,
      eligibleIds: rows.filter((row) => !errors.some((item) => item.incomeId === row.id)).map((row) => row.id),
      warnings,
      errors,
      canPost: rows.length === ids.length && dates.size === 1 && errors.length === 0 && !warnings.some((item) => item.code === "OVERPAYMENT_CONFIRMATION_REQUIRED"),
    };
  }

  async updatePending(input: {
    incomeId: string;
    userId: string;
    idempotencyKey: string;
    version: number;
    amount: number;
    date: string;
    paymentMethodId: string;
    companyPaymentAccountId: string;
    operationNumber?: string | null;
    note?: string | null;
  }) {
    let amountCents: number;
    try { amountCents = toMinorUnits(input.amount); }
    catch (error) { throw new BadRequestException(error instanceof Error ? error.message : "Importe inválido"); }
    if (amountCents <= 0) throw new BadRequestException("El monto debe ser mayor que cero.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date) || Number.isNaN(Date.parse(`${input.date}T00:00:00Z`))) throw new BadRequestException("La fecha de pago debe ser válida.");
    return this.runIdempotent(`income-edit:${input.userId}:${input.incomeId}`, input.idempotencyKey, {
      incomeId: input.incomeId,
      version: input.version,
      amount: amountCents,
      date: input.date,
      paymentMethodId: input.paymentMethodId,
      companyPaymentAccountId: input.companyPaymentAccountId,
      operationNumber: input.operationNumber?.trim() || null,
      note: input.note?.trim() || null,
    }, async (manager) => {
      const [row] = await this.lockPayments(manager, [input.incomeId]);
      if (!row) throw new NotFoundException("Ingreso no encontrado");
      if (row.status !== "PENDING_CONFIRMATION") throw new ConflictException("Solo se pueden editar ingresos por confirmar.");
      if (row.version !== input.version) throw new ConflictException({ code: "VERSION_CONFLICT", message: "El ingreso cambió. Actualiza la información antes de guardar." });
      const order = await manager.query<any[]>(`SELECT currency, total, is_active FROM sale_orders WHERE id = $1 FOR UPDATE`, [row.sale_order_id]);
      if (!order.length || !order[0].is_active) throw new ConflictException("El pedido está archivado.");
      const companyId = await this.companyScopeId(manager, input.userId);
      const account = await manager.query<any[]>(`SELECT currency, usage, is_active, type FROM company_payment_accounts
        WHERE company_payment_account_id = $1 AND ($2::uuid IS NULL OR company_id = $2) FOR UPDATE`, [input.companyPaymentAccountId, companyId]);
      if (!account.length || !account[0].is_active || !["INFLOW", "BOTH"].includes(account[0].usage) || account[0].currency !== order[0].currency) throw new BadRequestException("Selecciona una cuenta activa compatible con el pedido.");
      const operationNumber = input.operationNumber?.trim() || null;
      const method = await manager.query<any[]>(`SELECT is_active, code, requires_operation_reference FROM payment_methods WHERE method_id = $1`, [input.paymentMethodId]);
      if (!method.length || !method[0].is_active) throw new BadRequestException("Selecciona un método de pago activo.");
      if (!isCompanyPaymentAccountCompatible(method[0].code, account[0].type)) throw new BadRequestException("La cuenta receptora no es compatible con el método de pago.");
      if (method[0].requires_operation_reference && !operationNumber) throw new BadRequestException("Este método de pago requiere un número de operación.");
      const activeTotal = await manager.query<any[]>(
        `SELECT COALESCE(SUM(amount), 0)::numeric(14,2) AS amount FROM sale_payments
         WHERE sale_order_id = $1 AND id <> $2 AND status IN ('POSTED','PENDING_CONFIRMATION')`,
        [row.sale_order_id, row.id],
      );
      if (toMinorUnits(activeTotal[0].amount) + amountCents > toMinorUnits(order[0].total ?? 0)) {
        throw new ConflictException({ code: "OVERPAYMENT_CONFIRMATION_REQUIRED", message: "El ingreso supera el saldo pendiente. Ajusta el importe o revisa el total del pedido." });
      }
      const currentDate = String(row.payment_date).slice(0, 10);
      if (toMinorUnits(row.amount) === amountCents
        && currentDate === input.date
        && row.payment_method_id === input.paymentMethodId
        && row.company_payment_account_id === input.companyPaymentAccountId
        && (row.operation_number?.trim() || null) === operationNumber
        && (row.note?.trim() || null) === (input.note?.trim() || null)) {
        return { type: "success", incomeId: row.id, version: row.version, status: "PENDING_CONFIRMATION" };
      }
      const paymentTimestamp = `${input.date}T00:00:00-05:00`;
      try {
        await manager.query(
          `UPDATE sale_payments SET amount = $2, date = $3::timestamptz, payment_date = $4::date,
            payment_method_id = $5, company_payment_account_id = $6, method = COALESCE((SELECT name FROM payment_methods WHERE method_id = $5), method),
            operation_number = $7, operation_code = $7, note = $8, updated_by_user_id = $9, version = version + 1
           WHERE id = $1 AND status = 'PENDING_CONFIRMATION' AND version = $10`,
          [row.id, fromMinorUnits(amountCents), paymentTimestamp, input.date, input.paymentMethodId, input.companyPaymentAccountId, operationNumber, input.note?.trim() || null, input.userId, input.version],
        );
      } catch (error: any) {
        if (error?.code === "23505") throw new ConflictException({ code: "DUPLICATE_OPERATION_NUMBER", message: "Ese número de operación ya está registrado." });
        throw error;
      }
      await this.writeAuditAndOutbox(manager, row.sale_order_id, input.userId, "payment_pending_edited", row.id, { status: "PENDING_CONFIRMATION" });
      return { type: "success", incomeId: row.id, version: input.version + 1, status: "PENDING_CONFIRMATION" };
    });
  }

  async correctPosted(input: {
    incomeId: string;
    userId: string;
    expectedVersion: number;
    amount: number;
    date: string;
    paymentMethodId: string;
    companyPaymentAccountId: string;
    operationNumber?: string | null;
    note?: string | null;
    reason: string;
    idempotencyKey: string;
    confirmExcess?: boolean;
  }) {
    let amountCents: number;
    try { amountCents = toMinorUnits(input.amount); }
    catch (error) { throw new BadRequestException(error instanceof Error ? error.message : "Importe inválido"); }
    if (amountCents <= 0) throw new BadRequestException("El monto corregido debe ser mayor que cero.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date) || Number.isNaN(Date.parse(`${input.date}T00:00:00Z`))) throw new BadRequestException("La fecha de pago debe ser válida.");
    const reason = input.reason?.trim() ?? "";
    if (reason.length < 5 || reason.length > 500) throw new BadRequestException("El motivo debe tener entre 5 y 500 caracteres.");
    const operationNumber = input.operationNumber?.trim() || null;
    if (operationNumber && operationNumber.length > 100) throw new BadRequestException("El número de operación no puede superar 100 caracteres.");
    if (input.note && input.note.trim().length > 255) throw new BadRequestException("La descripción no puede superar 255 caracteres.");
    if (!Number.isInteger(input.expectedVersion) || input.expectedVersion < 1) throw new BadRequestException("Envía la versión actual del ingreso.");

    return this.runIdempotent(
      `correct:${input.userId}:${input.incomeId}`,
      input.idempotencyKey,
      {
        incomeId: input.incomeId,
        expectedVersion: input.expectedVersion,
        amount: fromMinorUnits(amountCents),
        date: input.date,
        paymentMethodId: input.paymentMethodId,
        companyPaymentAccountId: input.companyPaymentAccountId,
        operationNumber,
        note: input.note?.trim() || null,
        reason,
        confirmExcess: Boolean(input.confirmExcess),
      },
      async (manager) => {
        const [original] = await this.lockPayments(manager, [input.incomeId]);
        if (!original) throw new NotFoundException("Ingreso no encontrado.");
        if (original.status !== "POSTED") throw new ConflictException("Solo se puede corregir un ingreso contabilizado.");
        if (original.version !== input.expectedVersion) throw new ConflictException({ code: "VERSION_CONFLICT", message: "El ingreso cambió. Actualiza la información antes de corregirlo." });

        const [order] = await manager.query<any[]>(
          `SELECT so.id, so.client_id, so.total, so.currency, so.is_active,
                  UPPER(COALESCE(sos.code, '')) AS state_code
           FROM sale_orders so
           LEFT JOIN workflow_states ws ON ws.id = so.current_state_id
           LEFT JOIN sale_order_states sos ON sos.id = ws.sale_order_state_id
           WHERE so.id = $1 FOR UPDATE OF so`,
          [original.sale_order_id],
        );
        if (!order || !order.is_active || order.state_code === "CANCELLED") throw new ConflictException("No se puede corregir un ingreso de un pedido cancelado o archivado.");
        if (order.currency !== original.currency) throw new ConflictException({ code: "CURRENCY_MISMATCH", message: "La moneda del ingreso ya no coincide con la del pedido." });

        const [dependencies] = await manager.query<any[]>(
          `SELECT
             EXISTS(SELECT 1 FROM bank_reconciliation_allocations WHERE sale_payment_id = $1 AND unreconciled_at IS NULL) AS reconciled,
             EXISTS(SELECT 1 FROM customer_refunds WHERE sale_payment_id = $1 AND status IN ('PENDING','POSTED')) AS has_refunds,
             EXISTS(SELECT 1 FROM customer_credit_movements WHERE sale_payment_id = $1) AS has_credit_movements`,
          [original.id],
        );
        if (dependencies?.reconciled || dependencies?.has_refunds || dependencies?.has_credit_movements) {
          throw new ConflictException({ code: "INCOME_DEPENDENCIES_MUST_BE_RESOLVED", message: "Desconcilia el ingreso y resuelve sus créditos o reembolsos antes de corregirlo." });
        }

        const [movement] = await manager.query<any[]>(
          `SELECT * FROM financial_account_movements WHERE sale_payment_id = $1 AND movement_type = 'INCOME'`,
          [original.id],
        );
        if (!movement) throw new ConflictException({ code: "ORIGINAL_MOVEMENT_MISSING", message: "No se encontró el movimiento original; revisa la conciliación financiera antes de corregir." });

        const companyId = await this.companyScopeId(manager, input.userId);
        const [account] = await manager.query<any[]>(
          `SELECT currency, usage, is_active, type FROM company_payment_accounts
           WHERE company_payment_account_id = $1 AND ($2::uuid IS NULL OR company_id = $2) FOR UPDATE`,
          [input.companyPaymentAccountId, companyId],
        );
        if (!account || !account.is_active || !["INFLOW", "BOTH"].includes(account.usage) || account.currency !== order.currency) {
          throw new BadRequestException("Selecciona una cuenta activa compatible con el pedido y su moneda.");
        }
        const [method] = await manager.query<any[]>(
          `SELECT is_active, code, name, requires_operation_reference FROM payment_methods WHERE method_id = $1 FOR UPDATE`,
          [input.paymentMethodId],
        );
        if (!method?.is_active) throw new BadRequestException("Selecciona un método de pago activo.");
        if (!isCompanyPaymentAccountCompatible(method.code, account.type)) throw new BadRequestException("La cuenta receptora no es compatible con el método de pago.");
        if (method.requires_operation_reference && !operationNumber) throw new BadRequestException("Este método de pago requiere un número de operación.");

        const [totals] = await manager.query<any[]>(
          `SELECT COALESCE(SUM(amount), 0)::numeric(14,2) AS active_total
           FROM sale_payments
           WHERE sale_order_id = $1 AND id <> $2 AND status IN ('POSTED','PENDING_CONFIRMATION')`,
          [original.sale_order_id, original.id],
        );
        const activeCents = toMinorUnits(totals?.active_total ?? 0);
        const appliedCents = Math.min(amountCents, Math.max(toMinorUnits(order.total) - activeCents, 0));
        const excessCents = amountCents - appliedCents;
        if (excessCents > 0 && !input.confirmExcess) {
          throw new ConflictException({ code: "OVERPAYMENT_CONFIRMATION_REQUIRED", message: "Confirma que el excedente de la corrección quedará como saldo a favor del cliente." });
        }

        const paymentDate = input.date;
        const paymentTimestamp = `${paymentDate}T00:00:00-05:00`;
        await manager.query(
          `INSERT INTO financial_account_movements
             (company_payment_account_id, sale_payment_id, reverses_movement_id, movement_type, amount, currency, operation_date, created_by_user_id, reason)
           VALUES ($1, $2, $3, 'REVERSAL', $4, $5::currency_type, CURRENT_DATE, $6, $7)`,
          [movement.company_payment_account_id, original.id, movement.id, fromMinorUnits(-toMinorUnits(movement.amount)), original.currency, input.userId, reason],
        );
        await manager.query(
          `INSERT INTO sale_payment_allocations (sale_payment_id, sale_order_id, amount, currency, created_by_user_id)
           SELECT sale_payment_id, sale_order_id, -amount, currency, $2
           FROM sale_payment_allocations WHERE sale_payment_id = $1 AND amount > 0`,
          [original.id, input.userId],
        );
        await manager.query(
          `UPDATE sale_payments SET status = 'REVERSED', reversed_at = now(), reversed_by_user_id = $2, updated_by_user_id = $2,
             voided_at = now(), voided_by_user_id = $2, void_reason = $3, financial_reason = $3, version = version + 1
           WHERE id = $1 AND status = 'POSTED' AND version = $4`,
          [original.id, input.userId, reason, input.expectedVersion],
        );

        let corrected: any;
        try {
          [corrected] = await manager.query<any[]>(
            `INSERT INTO sale_payments
               (sale_order_id, date, payment_date, method, operation_number, operation_code, amount, note,
                company_payment_account_id, payment_method_id, currency, status, version, created_by_user_id,
                updated_by_user_id, posted_at, accounting_date, posted_by_user_id, corrected_from_payment_id, financial_reason)
             VALUES ($1, $2::timestamptz, $3::date, $4, $5, $5, $6, $7, $8, $9, $10::currency_type,
                     'POSTED', 1, $11, $11, now(), $3::date, $11, $12, $13)
             RETURNING id, version, status`,
            [original.sale_order_id, paymentTimestamp, paymentDate, method.name, operationNumber, fromMinorUnits(amountCents), input.note?.trim() || null, input.companyPaymentAccountId, input.paymentMethodId, original.currency, input.userId, original.id, reason],
          );
        } catch (error: any) {
          if (error?.code === "23505") throw new ConflictException({ code: "DUPLICATE_OPERATION_NUMBER", message: "Ese número de operación ya está registrado." });
          throw error;
        }
        if (!corrected?.id) throw new ConflictException("No se pudo crear el ingreso corregido.");

        await manager.query(
          `INSERT INTO financial_account_movements
             (company_payment_account_id, sale_payment_id, movement_type, amount, currency, operation_date, created_by_user_id, reason)
           VALUES ($1, $2, 'INCOME', $3, $4::currency_type, $5::date, $6, $7)`,
          [input.companyPaymentAccountId, corrected.id, fromMinorUnits(amountCents), original.currency, paymentDate, input.userId, reason],
        );
        if (appliedCents > 0) await manager.query(
          `INSERT INTO sale_payment_allocations (sale_payment_id, sale_order_id, amount, currency, created_by_user_id)
           VALUES ($1, $2, $3, $4::currency_type, $5)`,
          [corrected.id, original.sale_order_id, fromMinorUnits(appliedCents), original.currency, input.userId],
        );
        if (excessCents > 0) await manager.query(
          `INSERT INTO customer_credit_movements
             (client_id, sale_payment_id, source_sale_order_id, movement_type, amount, currency, created_by_user_id, reason)
           VALUES ($1, $2, $3, 'CREDIT', $4, $5::currency_type, $6, $7)`,
          [order.client_id, corrected.id, original.sale_order_id, fromMinorUnits(excessCents), original.currency, input.userId, "Excedente al corregir ingreso: " + reason],
        );
        await this.writeAuditAndOutbox(manager, original.sale_order_id, input.userId, "payment_corrected_out", original.id, { status: "REVERSED", correctedIncomeId: corrected.id, reason });
        await this.writeAuditAndOutbox(manager, original.sale_order_id, input.userId, "payment_corrected_in", corrected.id, { status: "POSTED", correctedFromIncomeId: original.id, amount: fromMinorUnits(amountCents), currency: original.currency, reason });
        return {
          type: "success",
          sourceIncomeId: original.id,
          incomeId: corrected.id,
          sourceStatus: "REVERSED",
          status: "POSTED",
          amount: fromMinorUnits(amountCents),
          currency: original.currency,
          version: Number(corrected.version ?? 1),
          excess: fromMinorUnits(excessCents),
        };
      },
    );
  }

  async transferPending(input: {
    incomeId: string;
    targetSaleOrderId: string;
    userId: string;
    expectedVersion: number;
    reason: string;
    idempotencyKey: string;
  }) {
    if (input.incomeId === input.targetSaleOrderId) throw new BadRequestException("Selecciona un pedido destino diferente.");
    const reason = input.reason?.trim() ?? "";
    if (reason.length < 5 || reason.length > 500) throw new BadRequestException("El motivo debe tener entre 5 y 500 caracteres.");
    if (!Number.isInteger(input.expectedVersion) || input.expectedVersion < 1) throw new BadRequestException("Envía la versión actual del ingreso.");
    return this.runIdempotent(
      `transfer:${input.userId}:${input.incomeId}`,
      input.idempotencyKey,
      { incomeId: input.incomeId, targetSaleOrderId: input.targetSaleOrderId, expectedVersion: input.expectedVersion, reason },
      async (manager) => {
        const [payment] = await this.lockPayments(manager, [input.incomeId]);
        if (!payment) throw new NotFoundException("Ingreso no encontrado.");
        if (payment.status !== "PENDING_CONFIRMATION") throw new ConflictException("Solo se pueden transferir ingresos por confirmar.");
        if (payment.version !== input.expectedVersion) throw new ConflictException({ code: "VERSION_CONFLICT", message: "El ingreso cambió. Actualiza la información antes de transferirlo." });

        const orderIds = [payment.sale_order_id, input.targetSaleOrderId].sort();
        const orders = await manager.query<any[]>(
          `SELECT so.id, so.client_id, so.currency, so.total, so.is_active,
                  UPPER(COALESCE(sos.code, '')) AS state_code
           FROM sale_orders so
           LEFT JOIN workflow_states ws ON ws.id = so.current_state_id
           LEFT JOIN sale_order_states sos ON sos.id = ws.sale_order_state_id
           WHERE so.id = ANY($1::uuid[]) ORDER BY so.id FOR UPDATE OF so`,
          [orderIds],
        );
        const source = orders.find((order) => order.id === payment.sale_order_id);
        const target = orders.find((order) => order.id === input.targetSaleOrderId);
        if (!source || !target) throw new NotFoundException("No se encontró el pedido origen o destino.");
        if (!target.is_active || target.state_code === "CANCELLED") throw new ConflictException({ code: "TRANSFER_TARGET_NOT_ACTIVE", message: "El pedido destino debe estar activo y no cancelado." });
        if (source.client_id !== target.client_id) throw new ConflictException({ code: "TRANSFER_CLIENT_MISMATCH", message: "El pago solo puede transferirse a un pedido del mismo cliente." });
        if (source.currency !== target.currency || payment.currency !== target.currency) throw new ConflictException({ code: "CURRENCY_MISMATCH", message: "El pedido destino debe usar la misma moneda del pago y del pedido origen." });

        const [activeTotal] = await manager.query<any[]>(
          `SELECT COALESCE(SUM(amount), 0)::numeric(14,2) AS amount FROM sale_payments
           WHERE sale_order_id = $1 AND status IN ('POSTED','PENDING_CONFIRMATION')`,
          [target.id],
        );
        if (toMinorUnits(activeTotal?.amount ?? 0) + toMinorUnits(payment.amount) > toMinorUnits(target.total ?? 0)) {
          throw new ConflictException({ code: "TRANSFER_TARGET_OVERPAYMENT", message: "El pago supera el saldo disponible del pedido destino." });
        }

        await manager.query(
          `UPDATE sale_payments SET sale_order_id = $2, updated_by_user_id = $3, version = version + 1
           WHERE id = $1 AND status = 'PENDING_CONFIRMATION' AND version = $4`,
          [payment.id, target.id, input.userId, input.expectedVersion],
        );
        await this.writeAuditAndOutbox(manager, source.id, input.userId, "payment_pending_transferred_out", payment.id, { targetSaleOrderId: target.id, reason });
        await this.writeAuditAndOutbox(manager, target.id, input.userId, "payment_pending_transferred_in", payment.id, { sourceSaleOrderId: source.id, reason });
        return { type: "success", incomeId: payment.id, sourceSaleOrderId: source.id, targetSaleOrderId: target.id, version: input.expectedVersion + 1, status: "PENDING_CONFIRMATION" };
      },
    );
  }

  async listTransferTargets(incomeId: string, search: string, allowedSaleOrderIds: string[] | null) {
    const [payment] = await this.entityManager.query<PaymentRow[]>(
      `SELECT sp.*, sp.payment_date::text AS payment_date
       FROM sale_payments sp WHERE sp.id = $1`,
      [incomeId],
    );
    if (!payment) throw new NotFoundException("Ingreso no encontrado.");
    if (payment.status !== "PENDING_CONFIRMATION") throw new ConflictException("Solo se pueden transferir ingresos por confirmar.");

    const query = search.trim();
    const amountCents = toMinorUnits(payment.amount);
    const rows = await this.entityManager.query<any[]>(
      `SELECT so.id,
              COALESCE(NULLIF(TRIM(CONCAT_WS('-', so.serie, so.correlative::text)), ''), so.id::text) AS number,
              COALESCE(c.full_name, 'Cliente') AS client_name,
              so.total::numeric(14,2)::text AS total,
              (so.total - COALESCE(SUM(sp.amount) FILTER (WHERE sp.status IN ('POSTED','PENDING_CONFIRMATION')), 0))::numeric(14,2)::text AS available
       FROM sale_orders so
       JOIN clients c ON c.id = so.client_id
       LEFT JOIN sale_payments sp ON sp.sale_order_id = so.id
       LEFT JOIN workflow_states ws ON ws.id = so.current_state_id
       LEFT JOIN sale_order_states sos ON sos.id = ws.sale_order_state_id
       WHERE so.client_id = (SELECT source.client_id FROM sale_orders source WHERE source.id = $1)
         AND so.currency = $2::currency_type
         AND so.id <> $3
         AND so.is_active = TRUE
         AND UPPER(COALESCE(sos.code, '')) <> 'CANCELLED'
         AND ($6::uuid[] IS NULL OR so.id = ANY($6::uuid[]))
         AND ($4 = '' OR CONCAT_WS(' ', so.serie, so.correlative::text, c.full_name) ILIKE '%' || $4 || '%')
       GROUP BY so.id, c.full_name
       HAVING (so.total - COALESCE(SUM(sp.amount) FILTER (WHERE sp.status IN ('POSTED','PENDING_CONFIRMATION')), 0)) >= $5
       ORDER BY so.created_at DESC, so.id
       LIMIT 30`,
      [payment.sale_order_id, payment.currency, payment.sale_order_id, query, fromMinorUnits(amountCents), allowedSaleOrderIds],
    );
    return rows.map((row) => ({
      saleOrderId: row.id,
      saleOrderNumber: row.number,
      clientName: row.client_name,
      total: Number(row.total),
      available: Number(row.available),
      currency: payment.currency,
    }));
  }

  async listCancellationTargets(incomeId: string, userId: string, search: string, allowedSaleOrderIds: string[] | null) {
    const [payment] = await this.entityManager.query<PaymentRow[]>(
      `SELECT sp.*, sp.payment_date::text AS payment_date FROM sale_payments sp WHERE sp.id = $1`,
      [incomeId],
    );
    if (!payment || !["PENDING_CONFIRMATION", "POSTED"].includes(payment.status)) throw new ConflictException("Solo se pueden resolver ingresos pendientes o contabilizados.");
    await this.requirePermission(
      userId,
      payment.status === "PENDING_CONFIRMATION" ? "sale_orders.payments.transfer_pending" : "customer_credits.apply",
    );
    const query = search.trim();
    const rows = await this.entityManager.query<any[]>(
      `SELECT so.id,
              COALESCE(NULLIF(TRIM(CONCAT_WS('-', so.serie, so.correlative::text)), ''), so.id::text) AS number,
              COALESCE(c.full_name, 'Cliente') AS client_name,
              so.total::numeric(14,2)::text AS total,
              (so.total - COALESCE((SELECT SUM(spa.amount) FROM sale_payment_allocations spa
                 JOIN sale_payments posted ON posted.id = spa.sale_payment_id
                 WHERE spa.sale_order_id = so.id AND posted.status = 'POSTED'), 0)
               - COALESCE((SELECT SUM(pending.amount) FROM sale_payments pending
                 WHERE pending.sale_order_id = so.id AND pending.status = 'PENDING_CONFIRMATION'), 0))::numeric(14,2)::text AS available
       FROM sale_orders source
       JOIN sale_orders so ON so.client_id = source.client_id AND so.currency = $2::currency_type
       JOIN clients c ON c.id = so.client_id
       LEFT JOIN workflow_states ws ON ws.id = so.current_state_id
       LEFT JOIN sale_order_states sos ON sos.id = ws.sale_order_state_id
       WHERE source.id = $1 AND so.id <> source.id AND so.is_active = TRUE
         AND UPPER(COALESCE(sos.code, '')) <> 'CANCELLED'
         AND ($4::uuid[] IS NULL OR so.id = ANY($4::uuid[]))
         AND ($3 = '' OR CONCAT_WS(' ', so.serie, so.correlative::text, c.full_name) ILIKE '%' || $3 || '%')
       ORDER BY so.created_at DESC, so.id LIMIT 30`,
      [payment.sale_order_id, payment.currency, query, allowedSaleOrderIds],
    );
    return rows.map((row) => ({
      saleOrderId: row.id,
      saleOrderNumber: row.number,
      clientName: row.client_name,
      total: Number(row.total),
      available: Number(row.available),
      currency: payment.currency,
    }));
  }

  async postOne(input: { incomeId: string; userId: string; expectedVersion: number; idempotencyKey: string; confirmExcess?: boolean }) {
    return this.postBatch({ ...input, incomeIds: [input.incomeId], expectedVersions: [{ id: input.incomeId, version: input.expectedVersion }] });
  }

  async postBatch(input: {
    incomeIds: string[];
    userId: string;
    expectedVersions: ExpectedPayment[];
    idempotencyKey: string;
    confirmExcess?: boolean;
  }) {
    const ids = this.normalizeIds(input.incomeIds);
    if (!ids.length) throw new BadRequestException("Selecciona al menos un ingreso");
    const expected = new Map((input.expectedVersions ?? []).map((item) => [item.id, item.version]));
    if (expected.size !== ids.length || ids.some((id) => !Number.isInteger(expected.get(id)) || (expected.get(id) ?? 0) < 1)) throw new BadRequestException("Envía una versión vigente para cada ingreso seleccionado");
    const canonicalExpectedVersions = ids.map((id) => ({ id, version: expected.get(id)! }));
    return this.runIdempotent(`post:${input.userId}`, input.idempotencyKey, { ids, expectedVersions: canonicalExpectedVersions, confirmExcess: Boolean(input.confirmExcess) }, async (manager) => {
      const companyId = await this.companyScopeId(manager, input.userId);
      const rows = await this.lockPayments(manager, ids);
      if (rows.length !== ids.length) throw new NotFoundException("Uno o más ingresos ya no existen");
      const dates = new Set(rows.map((row) => String(row.payment_date).slice(0, 10)));
      if (dates.size !== 1) throw new BadRequestException({ code: "BATCH_DATE_MISMATCH", message: "Todos los ingresos del lote deben tener la misma fecha de pago." });
      for (const row of rows) {
        const result = await this.validateForPosting(manager, row, input.userId, expected.get(row.id));
        if (result.error) throw new ConflictException({ incomeId: row.id, ...result.error });
        if (result.warnings.some((warning) => warning.code === "OVERPAYMENT_CONFIRMATION_REQUIRED") && !input.confirmExcess) {
          throw new ConflictException({ incomeId: row.id, code: "OVERPAYMENT_CONFIRMATION_REQUIRED", message: "Confirma que el excedente quedará como saldo a favor del cliente." });
        }
      }
      const orderIds = [...new Set(rows.map((row) => row.sale_order_id))].sort();
      const orders = await manager.query<any[]>(
        `SELECT so.id, so.client_id, so.total, so.currency, so.is_active,
                UPPER(COALESCE(sos.code, '')) AS state_code
         FROM sale_orders so
         LEFT JOIN workflow_states ws ON ws.id = so.current_state_id
         LEFT JOIN sale_order_states sos ON sos.id = ws.sale_order_state_id
         WHERE so.id = ANY($1::uuid[]) ORDER BY so.id FOR UPDATE OF so`,
        [orderIds],
      );
      const orderById = new Map(orders.map((order) => [order.id, order]));
      const accounts = [...new Set(rows.map((row) => row.company_payment_account_id).filter(Boolean))].sort();
      if (accounts.length) {
        await manager.query(`SELECT company_payment_account_id FROM company_payment_accounts
          WHERE company_payment_account_id = ANY($1::uuid[])
            AND ($2::uuid IS NULL OR company_id = $2)
          ORDER BY company_payment_account_id FOR UPDATE`, [accounts, companyId]);
      }

      const posted: Array<{ incomeId: string; amount: number; currency: string; paymentDate: string }> = [];
      for (const row of rows) {
        const order = orderById.get(row.sale_order_id);
        if (!order || !order.is_active || order.state_code === "CANCELLED") throw new ConflictException({ incomeId: row.id, code: "SALE_ORDER_NOT_POSTABLE", message: "El pedido está cancelado o archivado." });
        if (row.currency !== order.currency) throw new ConflictException({ incomeId: row.id, code: "CURRENCY_MISMATCH", message: "La moneda del ingreso no coincide con la del pedido." });
        const account = await manager.query<any[]>(`SELECT company_payment_account_id FROM company_payment_accounts
          WHERE company_payment_account_id = $1
            AND ($2::uuid IS NULL OR company_id = $2)`, [row.company_payment_account_id, companyId]);
        const method = row.payment_method_id ? await manager.query<any[]>(`SELECT method_id FROM payment_methods WHERE method_id = $1 AND is_active = true`, [row.payment_method_id]) : [];
        if (!account.length || !method.length) throw new ConflictException({ incomeId: row.id, code: "PAYMENT_CONFIGURATION_INVALID", message: "La cuenta receptora o el método ya no está disponible." });

        const orderAmount = toMinorUnits(order.total);
        const current = await manager.query<any[]>(
          `SELECT COALESCE(SUM(amount), 0)::numeric(14,2) AS total FROM sale_payments
           WHERE sale_order_id = $1 AND status = 'POSTED'`,
          [order.id],
        );
        const currentlyPosted = toMinorUnits(current[0]?.total ?? 0);
        const postedInThisBatch = posted.filter((item) => rows.find((itemRow) => itemRow.id === item.incomeId)?.sale_order_id === order.id).reduce((sum, item) => sum + toMinorUnits(item.amount), 0);
        const amount = toMinorUnits(row.amount);
        const applied = Math.min(amount, Math.max(orderAmount - currentlyPosted - postedInThisBatch, 0));
        const excess = amount - applied;
        const paymentDate = String(row.payment_date).slice(0, 10);

        await manager.query(
          `UPDATE sale_payments SET status = 'POSTED', posted_at = now(), posted_by_user_id = $2,
             accounting_date = $3::date, version = version + 1
           WHERE id = $1 AND status = 'PENDING_CONFIRMATION' AND version = $4`,
          [row.id, input.userId, paymentDate, row.version],
        );
        await manager.query(
          `INSERT INTO financial_account_movements
             (company_payment_account_id, sale_payment_id, movement_type, amount, currency, operation_date, created_by_user_id)
           VALUES ($1, $2, 'INCOME', $3, $4::currency_type, $5::date, $6)`,
          [row.company_payment_account_id, row.id, fromMinorUnits(amount), row.currency, paymentDate, input.userId],
        );
        if (applied > 0) await manager.query(
          `INSERT INTO sale_payment_allocations (sale_payment_id, sale_order_id, amount, currency, created_by_user_id)
           VALUES ($1, $2, $3, $4::currency_type, $5)`,
          [row.id, order.id, fromMinorUnits(applied), row.currency, input.userId],
        );
        if (excess > 0) await manager.query(
          `INSERT INTO customer_credit_movements
             (client_id, sale_payment_id, source_sale_order_id, movement_type, amount, currency, created_by_user_id, reason)
           VALUES ($1, $2, $3, 'CREDIT', $4, $5::currency_type, $6, 'Excedente al contabilizar ingreso')`,
          [order.client_id, row.id, order.id, fromMinorUnits(excess), row.currency, input.userId],
        );
        await this.writeAuditAndOutbox(manager, order.id, input.userId, "payment_posted", row.id, { status: "POSTED", amount: fromMinorUnits(amount), currency: row.currency });
        posted.push({ incomeId: row.id, amount: fromMinorUnits(amount), currency: row.currency, paymentDate });
      }
      return { type: "success", batchId: input.idempotencyKey, paymentDate: [...dates][0], count: posted.length, totalsByCurrency: this.groupTotals(posted), payments: posted };
    });
  }

  async getBatchResult(batchId: string, userId: string) {
    const rows = await this.entityManager.query<any[]>(
      `SELECT status, response_body, completed_at
       FROM financial_idempotency_records
       WHERE idempotency_key = $1::uuid
         AND (scope_key = $2 OR scope_key LIKE $3)
       ORDER BY created_at DESC
       LIMIT 2`,
      [batchId, `post:${userId}`, `post:${userId}:%`],
    );
    if (!rows.length) throw new NotFoundException("No se encontró una contabilización masiva para esta clave.");
    if (rows.length > 1) {
      throw new ConflictException({
        code: "AMBIGUOUS_BATCH_ID",
        message: "La clave corresponde a más de un lote. Contacta a Finanzas antes de repetir la operación.",
      });
    }
    const [row] = rows;
    if (row.status !== "COMPLETED" || !row.response_body) {
      throw new ConflictException({
        code: "BATCH_RESULT_NOT_READY",
        message: "El lote todavía no tiene un resultado recuperable. Consulta nuevamente en unos segundos.",
      });
    }
    return row.response_body;
  }

  async getAvailableCustomerCredits(clientId: string, userId: string, allowedIncomeIds: string[] | null) {
    await this.requirePermission(userId, "customer_credits.view");
    const rows = await this.entityManager.query<any[]>(
      `SELECT currency, SUM(amount)::numeric(14,2)::text AS available
       FROM customer_credit_movements
       WHERE client_id = $1
         AND ($2::uuid[] IS NULL OR sale_payment_id = ANY($2::uuid[]))
       GROUP BY currency
       HAVING SUM(amount) > 0
       ORDER BY currency`,
      [clientId, allowedIncomeIds],
    );
    return rows.map((row) => ({ currency: row.currency, available: Number(row.available) }));
  }

  async applyCustomerCredit(input: {
    clientId: string;
    saleOrderId: string;
    amount: number;
    userId: string;
    reason: string;
    idempotencyKey: string;
    allowedIncomeIds: string[] | null;
  }) {
    await this.requirePermission(input.userId, "customer_credits.apply");
    let amountCents: number;
    try { amountCents = toMinorUnits(input.amount); }
    catch (error) { throw new BadRequestException(error instanceof Error ? error.message : "Importe inválido"); }
    if (amountCents <= 0) throw new BadRequestException("El monto a aplicar debe ser mayor que cero.");
    const reason = input.reason?.trim() ?? "";
    if (reason.length < 5 || reason.length > 500) throw new BadRequestException("El motivo debe tener entre 5 y 500 caracteres.");
    return this.runIdempotent(
      `credit-apply:${input.userId}:${input.clientId}`,
      input.idempotencyKey,
      { clientId: input.clientId, saleOrderId: input.saleOrderId, amount: fromMinorUnits(amountCents), reason, allowedIncomeIds: input.allowedIncomeIds },
      async (manager) => {
        // Lock the client first so two simultaneous applications cannot spend the same balance.
        const [client] = await manager.query<any[]>(`SELECT id FROM clients WHERE id = $1 FOR UPDATE`, [input.clientId]);
        if (!client) throw new NotFoundException("Cliente no encontrado.");
        const [order] = await manager.query<any[]>(
          `SELECT so.id, so.client_id, so.total, so.currency, so.is_active,
                  UPPER(COALESCE(sos.code, '')) AS state_code,
                  COALESCE((SELECT SUM(spa.amount) FROM sale_payment_allocations spa
                    JOIN sale_payments sp ON sp.id = spa.sale_payment_id
                    WHERE spa.sale_order_id = so.id AND sp.status = 'POSTED'), 0)::numeric(14,2) AS applied_total
           FROM sale_orders so
           LEFT JOIN workflow_states ws ON ws.id = so.current_state_id
           LEFT JOIN sale_order_states sos ON sos.id = ws.sale_order_state_id
           WHERE so.id = $1 FOR UPDATE OF so`,
          [input.saleOrderId],
        );
        if (!order || order.client_id !== input.clientId) throw new ConflictException({ code: "CREDIT_TARGET_CLIENT_MISMATCH", message: "El pedido destino debe pertenecer al mismo cliente." });
        if (!order.is_active || order.state_code === "CANCELLED") throw new ConflictException({ code: "CREDIT_TARGET_NOT_ACTIVE", message: "El pedido destino debe estar activo y no cancelado." });
        const allowedIncomeIds = input.allowedIncomeIds;
        const availableCents = await this.getCreditBalanceForUpdate(manager, input.clientId, order.currency, allowedIncomeIds);
        if (availableCents < amountCents) throw new ConflictException({ code: "INSUFFICIENT_CUSTOMER_CREDIT", message: "El saldo a favor disponible no alcanza para esta aplicación.", available: fromMinorUnits(availableCents), currency: order.currency });
        const remainingCents = Math.max(toMinorUnits(order.total) - toMinorUnits(order.applied_total ?? 0), 0);
        if (amountCents > remainingCents) throw new ConflictException({ code: "CREDIT_EXCEEDS_ORDER_BALANCE", message: "El monto supera el saldo pendiente del pedido.", available: fromMinorUnits(remainingCents), currency: order.currency });

        const credits = await manager.query<any[]>(
          `SELECT source.id AS payment_id, source.sale_order_id, SUM(movement.amount)::numeric(14,2)::text AS available
           FROM customer_credit_movements movement
           JOIN sale_payments source ON source.id = movement.sale_payment_id AND source.status = 'POSTED'
           WHERE movement.client_id = $1 AND movement.currency = $2::currency_type
             AND ($3::uuid[] IS NULL OR source.id = ANY($3::uuid[]))
           GROUP BY source.id, source.sale_order_id
           HAVING SUM(movement.amount) > 0
           ORDER BY MIN(movement.created_at), source.id`,
          [input.clientId, order.currency, allowedIncomeIds],
        );
        let left = amountCents;
        for (const credit of credits) {
          if (left <= 0) break;
          const use = Math.min(left, toMinorUnits(credit.available));
          if (use <= 0) continue;
          await manager.query(
            `INSERT INTO customer_credit_movements
              (client_id, sale_payment_id, source_sale_order_id, target_sale_order_id, movement_type, amount, currency, created_by_user_id, reason)
             VALUES ($1, $2, $3, $4, 'APPLY', $5, $6::currency_type, $7, $8)`,
            [input.clientId, credit.payment_id, credit.sale_order_id, order.id, fromMinorUnits(-use), order.currency, input.userId, reason],
          );
          await manager.query(
            `INSERT INTO sale_payment_allocations (sale_payment_id, sale_order_id, amount, currency, created_by_user_id)
             VALUES ($1, $2, $3, $4::currency_type, $5)`,
            [credit.payment_id, order.id, fromMinorUnits(use), order.currency, input.userId],
          );
          left -= use;
        }
        if (left !== 0) throw new ConflictException({ code: "INSUFFICIENT_CUSTOMER_CREDIT", message: "El saldo cambió durante la aplicación; vuelve a consultar el crédito." });
        await this.paymentWorkflowReconciliation?.reconcile(
          { saleOrderId: order.id, executedBy: input.userId, source: "customer-credit-application" },
          new TypeormTransactionContext(manager),
        );
        await manager.query(`INSERT INTO sale_order_auditory (sale_order_id, executed_by, action_execution) VALUES ($1, $2, 'customer_credit_applied')`, [order.id, input.userId]);
        await manager.query(
          `INSERT INTO financial_outbox_events (event_type, aggregate_type, aggregate_id, payload)
           VALUES ('income.customer_credit_applied', 'sale_order', $1, $2::jsonb)`,
          [order.id, JSON.stringify({ saleOrderId: order.id, clientId: input.clientId, actorId: input.userId, amount: fromMinorUnits(amountCents), currency: order.currency, reason })],
        );
        return { type: "success", saleOrderId: order.id, clientId: input.clientId, amount: fromMinorUnits(amountCents), currency: order.currency };
      },
    );
  }

  private async getCreditBalanceForUpdate(manager: EntityManager, clientId: string, currency: string, allowedIncomeIds: string[] | null) {
    const [row] = await manager.query<any[]>(
      `SELECT COALESCE(SUM(amount), 0)::numeric(14,2) AS balance
       FROM customer_credit_movements
       WHERE client_id = $1 AND currency = $2::currency_type
         AND ($3::uuid[] IS NULL OR sale_payment_id = ANY($3::uuid[]))`,
      [clientId, currency, allowedIncomeIds],
    );
    return toMinorUnits(row?.balance ?? 0);
  }

  private async requirePermission(userId: string, code: string) {
    const permissions = await this.accessControl.getEffectivePermissions(userId);
    if (!permissions.includes("*") && !permissions.includes(code)) throw new ForbiddenException("No tienes permiso para realizar esta operación.");
  }

  /** null is the explicit system-wide wildcard; regular users are pinned to their own company. */
  private async companyScopeId(manager: EntityManager, userId: string): Promise<string | null> {
    const permissions = await this.accessControl.getEffectivePermissions(userId);
    if (permissions.includes("*")) return null;
    const [user] = await manager.query<Array<{ company_id: string | null }>>(
      `SELECT company_id FROM users WHERE user_id = $1`, [userId],
    );
    if (!user?.company_id) throw new ForbiddenException("El usuario no tiene una empresa asignada.");
    return user.company_id;
  }

  async createBankStatementLine(input: {
    userId: string; companyPaymentAccountId: string; bankReference: string; operationDate: string;
    amount: number; currency: string; idempotencyKey: string;
  }) {
    await this.requirePermission(input.userId, "income.reconciliation.reconcile");
    let amountCents: number;
    try { amountCents = toMinorUnits(input.amount); }
    catch (error) { throw new BadRequestException(error instanceof Error ? error.message : "Importe bancario inválido."); }
    const reference = input.bankReference?.trim();
    if (amountCents <= 0 || !reference || reference.length > 120) throw new BadRequestException("La referencia bancaria y un importe mayor a cero son obligatorios.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.operationDate) || Number.isNaN(Date.parse(`${input.operationDate}T00:00:00Z`))) throw new BadRequestException("La fecha bancaria no es válida.");
    return this.runIdempotent(`bank-statement-line:${input.userId}`, input.idempotencyKey, input, async (manager) => {
      const companyId = await this.companyScopeId(manager, input.userId);
      const [account] = await manager.query<any[]>(
        `SELECT company_payment_account_id, currency, usage, is_active FROM company_payment_accounts
         WHERE company_payment_account_id = $1
           AND ($2::uuid IS NULL OR company_id = $2)
         FOR UPDATE`, [input.companyPaymentAccountId, companyId],
      );
      if (!account || !account.is_active || !["INFLOW", "BOTH"].includes(account.usage) || account.currency !== input.currency) {
        throw new BadRequestException("La cuenta bancaria debe estar activa y coincidir con la moneda de la línea.");
      }
      try {
        const [line] = await manager.query<any[]>(
          `INSERT INTO bank_statement_lines (company_payment_account_id, bank_reference, operation_date, amount, currency, created_by_user_id)
           VALUES ($1, $2, $3::date, $4, $5, $6)
           RETURNING id, company_payment_account_id AS "companyPaymentAccountId", bank_reference AS "bankReference",
             operation_date::text AS "operationDate", amount::text AS amount, currency`,
          [input.companyPaymentAccountId, reference, input.operationDate, fromMinorUnits(amountCents), input.currency, input.userId],
        );
        await manager.query(
          `INSERT INTO financial_outbox_events (event_type, aggregate_type, aggregate_id, payload)
           VALUES ('income.bank_statement_line_created', 'bank_statement_line', $1, $2::jsonb)`,
          [line.id, JSON.stringify({ ...line, actorId: input.userId })],
        );
        return { type: "success", line };
      } catch (error: any) {
        if (error?.code === "23505") throw new ConflictException({ code: "DUPLICATE_BANK_REFERENCE", message: "Esa referencia bancaria ya existe para la cuenta seleccionada." });
        throw error;
      }
    });
  }

  async listReconciliations(incomeId: string, userId: string, allowedAccountIds: string[] | null = null) {
    await this.requirePermission(userId, "income.reconciliation.view");
    const [payment] = await this.entityManager.query<any[]>(`SELECT id, amount::text AS amount FROM sale_payments WHERE id = $1`, [incomeId]);
    if (!payment) throw new NotFoundException("Ingreso no encontrado.");
    const items = await this.entityManager.query<any[]>(
      `SELECT a.id, a.amount::text AS amount, a.created_at AS "createdAt", a.unreconciled_at AS "unreconciledAt",
         a.unreconcile_reason AS "unreconcileReason", l.bank_reference AS "bankReference", l.operation_date::text AS "operationDate",
         l.amount::text AS "statementAmount", l.currency, l.company_payment_account_id AS "companyPaymentAccountId"
       FROM bank_reconciliation_allocations a JOIN bank_statement_lines l ON l.id = a.bank_statement_line_id
       WHERE a.sale_payment_id = $1
         AND ($2::uuid[] IS NULL OR l.company_payment_account_id = ANY($2::uuid[]))
       ORDER BY a.created_at, a.id`, [incomeId, allowedAccountIds],
    );
    const activeCents = items.filter((item) => !item.unreconciledAt).reduce((sum, item) => sum + toMinorUnits(item.amount), 0);
    return {
      items,
      reconciledAmount: fromMinorUnits(activeCents),
      status: activeCents === 0 ? "UNRECONCILED" : activeCents >= toMinorUnits(payment.amount) ? "RECONCILED" : "PARTIALLY_RECONCILED",
    };
  }

  async listAvailableBankStatementLines(userId: string, companyPaymentAccountId?: string, allowedAccountIds: string[] | null = null) {
    await this.requirePermission(userId, "income.reconciliation.view");
    const companyId = await this.companyScopeId(this.entityManager, userId);
    return this.entityManager.query<any[]>(
      `SELECT l.id, l.company_payment_account_id AS "companyPaymentAccountId", l.bank_reference AS "bankReference",
         l.operation_date::text AS "operationDate", l.amount::text AS amount, l.currency,
         (l.amount - COALESCE(SUM(a.amount) FILTER (WHERE a.unreconciled_at IS NULL), 0))::text AS available
       FROM bank_statement_lines l
       JOIN company_payment_accounts cpa ON cpa.company_payment_account_id = l.company_payment_account_id
       LEFT JOIN bank_reconciliation_allocations a ON a.bank_statement_line_id = l.id
       WHERE ($3::uuid IS NULL OR cpa.company_id = $3)
         AND ($1::uuid IS NULL OR l.company_payment_account_id = $1)
         AND ($2::uuid[] IS NULL OR l.company_payment_account_id = ANY($2::uuid[]))
       GROUP BY l.id
       HAVING l.amount - COALESCE(SUM(a.amount) FILTER (WHERE a.unreconciled_at IS NULL), 0) > 0
       ORDER BY l.operation_date DESC, l.created_at DESC, l.id DESC
       LIMIT 100`,
      [companyPaymentAccountId ?? null, allowedAccountIds, companyId],
    );
  }

  async getBankReconciliationReport(input: {
    userId: string; from: string; to: string; companyPaymentAccountId?: string; allowedAccountIds?: string[] | null;
  }) {
    await this.requirePermission(input.userId, "income.reconciliation.view");
    const companyId = await this.companyScopeId(this.entityManager, input.userId);
    const validDate = (value: string) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
      const date = new Date(`${value}T00:00:00.000Z`);
      return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
    };
    if (!validDate(input.from) || !validDate(input.to) || input.from > input.to) {
      throw new BadRequestException("Indica un periodo bancario válido.");
    }
    const days = (Date.parse(`${input.to}T00:00:00.000Z`) - Date.parse(`${input.from}T00:00:00.000Z`)) / 86_400_000;
    if (days > 366) throw new BadRequestException("El informe admite periodos de hasta 367 días.");

    const rows = await this.entityManager.query<any[]>(
      `SELECT l.id, l.company_payment_account_id AS "companyPaymentAccountId",
         cpa.name AS "accountName", l.bank_reference AS "bankReference",
         l.operation_date::text AS "operationDate", l.amount::text AS amount, l.currency,
         COALESCE(SUM(a.amount) FILTER (WHERE a.unreconciled_at IS NULL), 0)::numeric(14,2)::text AS "reconciledAmount",
         (l.amount - COALESCE(SUM(a.amount) FILTER (WHERE a.unreconciled_at IS NULL), 0))::numeric(14,2)::text AS "availableAmount",
         COUNT(a.id) FILTER (WHERE a.unreconciled_at IS NULL)::int AS "activeAllocationCount"
       FROM bank_statement_lines l
       JOIN company_payment_accounts cpa ON cpa.company_payment_account_id = l.company_payment_account_id
       LEFT JOIN bank_reconciliation_allocations a ON a.bank_statement_line_id = l.id
       WHERE l.operation_date BETWEEN $1::date AND $2::date
         AND ($5::uuid IS NULL OR cpa.company_id = $5)
         AND ($3::uuid IS NULL OR l.company_payment_account_id = $3)
         AND ($4::uuid[] IS NULL OR l.company_payment_account_id = ANY($4::uuid[]))
       GROUP BY l.id, cpa.name
       ORDER BY l.operation_date, l.created_at, l.id
       LIMIT 2001`,
      [input.from, input.to, input.companyPaymentAccountId ?? null, input.allowedAccountIds ?? null, companyId],
    );
    const truncated = rows.length > 2000;
    const items = rows.slice(0, 2000).map((row) => {
      const amountCents = toMinorUnits(row.amount);
      const reconciledCents = toMinorUnits(row.reconciledAmount);
      return {
        ...row,
        status: reconciledCents === 0 ? "UNRECONCILED" : reconciledCents >= amountCents ? "RECONCILED" : "PARTIALLY_RECONCILED",
      };
    });
    const totalsByCurrency: Record<string, { statementAmount: number; reconciledAmount: number; availableAmount: number; lineCount: number }> = {};
    for (const row of items) {
      const total = totalsByCurrency[row.currency] ??= { statementAmount: 0, reconciledAmount: 0, availableAmount: 0, lineCount: 0 };
      total.statementAmount = fromMinorUnits(toMinorUnits(total.statementAmount) + toMinorUnits(row.amount));
      total.reconciledAmount = fromMinorUnits(toMinorUnits(total.reconciledAmount) + toMinorUnits(row.reconciledAmount));
      total.availableAmount = fromMinorUnits(toMinorUnits(total.availableAmount) + toMinorUnits(row.availableAmount));
      total.lineCount += 1;
    }
    return { from: input.from, to: input.to, items, totalsByCurrency, truncated };
  }

  async reconcileIncome(input: { incomeId: string; userId: string; bankStatementLineId: string; amount: number; idempotencyKey: string }) {
    await this.requirePermission(input.userId, "income.reconciliation.reconcile");
    let amountCents: number;
    try { amountCents = toMinorUnits(input.amount); }
    catch (error) { throw new BadRequestException(error instanceof Error ? error.message : "Importe conciliado inválido."); }
    if (amountCents <= 0) throw new BadRequestException("El importe conciliado debe ser mayor a cero.");
    return this.runIdempotent(`income-reconcile:${input.userId}:${input.incomeId}`, input.idempotencyKey, input, async (manager) => {
      const companyId = await this.companyScopeId(manager, input.userId);
      const [line] = await manager.query<any[]>(
        `SELECT l.* FROM bank_statement_lines l
         JOIN company_payment_accounts cpa ON cpa.company_payment_account_id = l.company_payment_account_id
         WHERE l.id = $1
           AND ($2::uuid IS NULL OR cpa.company_id = $2)
         FOR UPDATE OF l`, [input.bankStatementLineId, companyId],
      );
      if (!line) throw new NotFoundException("No se encontró la línea bancaria.");
      const [payment] = await this.lockPayments(manager, [input.incomeId]);
      if (!payment) throw new NotFoundException("Ingreso no encontrado.");
      if (payment.status !== "POSTED") throw new ConflictException("Solo se pueden conciliar ingresos contabilizados.");
      if (payment.company_payment_account_id !== line.company_payment_account_id || payment.currency !== line.currency) {
        throw new ConflictException("La cuenta y moneda del ingreso deben coincidir con la línea bancaria.");
      }
      const totals = await manager.query<any[]>(
        `SELECT COALESCE(SUM(amount),0)::text AS allocated FROM bank_reconciliation_allocations
         WHERE bank_statement_line_id = $1 AND unreconciled_at IS NULL`, [line.id],
      );
      const paymentTotals = await manager.query<any[]>(
        `SELECT COALESCE(SUM(amount),0)::text AS allocated FROM bank_reconciliation_allocations
         WHERE sale_payment_id = $1 AND unreconciled_at IS NULL`, [payment.id],
      );
      if (toMinorUnits(totals[0].allocated) + amountCents > toMinorUnits(line.amount)) throw new ConflictException({ code: "STATEMENT_LINE_AMOUNT_EXCEEDED", message: "El importe supera el saldo disponible de la línea bancaria." });
      if (toMinorUnits(paymentTotals[0].allocated) + amountCents > toMinorUnits(payment.amount)) throw new ConflictException({ code: "INCOME_RECONCILED_AMOUNT_EXCEEDED", message: "El importe supera el saldo conciliable del ingreso." });
      const [allocation] = await manager.query<any[]>(
        `INSERT INTO bank_reconciliation_allocations (bank_statement_line_id, sale_payment_id, amount, created_by_user_id)
         VALUES ($1, $2, $3, $4) RETURNING id, amount::text AS amount`,
        [line.id, payment.id, fromMinorUnits(amountCents), input.userId],
      );
      await this.writeAuditAndOutbox(manager, payment.sale_order_id, input.userId, "income_reconciled", payment.id, {
        allocationId: allocation.id, bankStatementLineId: line.id, amount: allocation.amount, bankReference: line.bank_reference,
      });
      return { type: "success", incomeId: payment.id, allocationId: allocation.id, amount: fromMinorUnits(amountCents) };
    });
  }

  async unreconcileIncome(input: { incomeId: string; allocationId: string; userId: string; reason: string; idempotencyKey: string }) {
    await this.requirePermission(input.userId, "income.reconciliation.unreconcile");
    const reason = input.reason?.trim();
    if (!reason || reason.length < 5 || reason.length > 500) throw new BadRequestException("El motivo debe tener entre 5 y 500 caracteres.");
    return this.runIdempotent(`income-unreconcile:${input.userId}:${input.incomeId}:${input.allocationId}`, input.idempotencyKey, { reason }, async (manager) => {
      const [payment] = await this.lockPayments(manager, [input.incomeId]);
      if (!payment) throw new NotFoundException("Ingreso no encontrado.");
      const [allocation] = await manager.query<any[]>(
        `SELECT id, amount::text AS amount, bank_statement_line_id, unreconciled_at FROM bank_reconciliation_allocations
         WHERE id = $1 AND sale_payment_id = $2 FOR UPDATE`, [input.allocationId, input.incomeId],
      );
      if (!allocation) throw new NotFoundException("No se encontró la asignación bancaria del ingreso.");
      if (allocation.unreconciled_at) throw new ConflictException("La asignación ya fue desconciliada.");
      await manager.query(
        `UPDATE bank_reconciliation_allocations SET unreconciled_by_user_id = $2, unreconciled_at = now(), unreconcile_reason = $3
         WHERE id = $1 AND unreconciled_at IS NULL`, [allocation.id, input.userId, reason],
      );
      await this.writeAuditAndOutbox(manager, payment.sale_order_id, input.userId, "income_unreconciled", payment.id, {
        allocationId: allocation.id, bankStatementLineId: allocation.bank_statement_line_id, amount: allocation.amount, reason,
      });
      const [active] = await manager.query<any[]>(
        `SELECT COALESCE(SUM(amount),0)::text AS amount FROM bank_reconciliation_allocations
         WHERE sale_payment_id = $1 AND unreconciled_at IS NULL`, [payment.id],
      );
      const activeCents = toMinorUnits(active.amount);
      return {
        type: "success", incomeId: payment.id, allocationId: allocation.id,
        reconciliationStatus: activeCents === 0 ? "UNRECONCILED" : activeCents >= toMinorUnits(payment.amount) ? "RECONCILED" : "PARTIALLY_RECONCILED",
      };
    });
  }

  async listRefunds(incomeId: string, userId: string) {
    await this.requirePermission(userId, "customer_refunds.view");
    const rows = await this.entityManager.query<any[]>(
      `SELECT cr.id, cr.amount::numeric(14,2)::text AS amount, cr.currency, cr.status,
              cr.operation_number AS "operationNumber", cr.reason, cr.created_by_user_id AS "createdByUserId",
              cr.posted_by_user_id AS "postedByUserId", cr.posted_at AS "postedAt", cr.reversed_by_user_id AS "reversedByUserId",
              cr.reversed_at AS "reversedAt", cr.created_at AS "createdAt", cr.company_payment_account_id AS "companyPaymentAccountId"
       FROM customer_refunds cr WHERE cr.sale_payment_id = $1 ORDER BY cr.created_at, cr.id`,
      [incomeId],
    );
    const [balance] = await this.entityManager.query<any[]>(
      `SELECT COALESCE(SUM(amount), 0)::numeric(14,2)::text AS available
       FROM customer_credit_movements WHERE sale_payment_id = $1`,
      [incomeId],
    );
    return { items: rows.map((row) => ({ ...row, amount: Number(row.amount) })), availableCredit: Number(balance?.available ?? 0) };
  }

  async createRefund(input: { incomeId: string; userId: string; amount: number; reason: string; idempotencyKey: string }) {
    await this.requirePermission(input.userId, "customer_refunds.create");
    let amountCents: number;
    try { amountCents = toMinorUnits(input.amount); }
    catch (error) { throw new BadRequestException(error instanceof Error ? error.message : "Importe inválido"); }
    if (amountCents <= 0) throw new BadRequestException("El importe del reembolso debe ser mayor que cero.");
    const reason = input.reason?.trim() ?? "";
    if (reason.length < 5 || reason.length > 500) throw new BadRequestException("El motivo debe tener entre 5 y 500 caracteres.");
    return this.runIdempotent(`refund-create:${input.userId}:${input.incomeId}`, input.idempotencyKey,
      { incomeId: input.incomeId, amount: fromMinorUnits(amountCents), reason }, async (manager) => {
        const [identity] = await manager.query<any[]>(
          `SELECT so.client_id FROM sale_payments sp JOIN sale_orders so ON so.id = sp.sale_order_id WHERE sp.id = $1`, [input.incomeId],
        );
        if (!identity) throw new NotFoundException("Ingreso no encontrado.");
        await manager.query(`SELECT id FROM clients WHERE id = $1 FOR UPDATE`, [identity.client_id]);
        const [payment] = await manager.query<any[]>(`SELECT * FROM sale_payments WHERE id = $1 FOR UPDATE`, [input.incomeId]);
        if (!payment) throw new NotFoundException("Ingreso no encontrado.");
        if (payment.status !== "POSTED") throw new ConflictException("Solo puedes reembolsar un ingreso contabilizado.");
        const [credit] = await manager.query<any[]>(
          `SELECT COALESCE(SUM(amount), 0)::numeric(14,2)::text AS available
           FROM customer_credit_movements WHERE sale_payment_id = $1`, [payment.id],
        );
        const availableCents = toMinorUnits(credit?.available ?? 0);
        if (amountCents > availableCents) throw new ConflictException({
          code: "REFUND_EXCEEDS_AVAILABLE_CREDIT",
          message: "El reembolso supera el saldo a favor disponible de este ingreso. Libera primero la aplicación al pedido o reduce el importe.",
          available: fromMinorUnits(Math.max(availableCents, 0)), currency: payment.currency,
        });
        const [refund] = await manager.query<any[]>(
          `INSERT INTO customer_refunds (sale_payment_id, client_id, amount, currency, status, reason, created_by_user_id)
           VALUES ($1, $2, $3, $4::currency_type, 'PENDING', $5, $6) RETURNING id`,
          [payment.id, identity.client_id, fromMinorUnits(amountCents), payment.currency, reason, input.userId],
        );
        await manager.query(
          `INSERT INTO customer_credit_movements
             (client_id, sale_payment_id, source_sale_order_id, movement_type, amount, currency, created_by_user_id, reason)
           VALUES ($1, $2, $3, 'REFUND', $4, $5::currency_type, $6, $7)`,
          [identity.client_id, payment.id, payment.sale_order_id, fromMinorUnits(-amountCents), payment.currency, input.userId, reason],
        );
        await this.writeRefundAuditAndOutbox(manager, payment.sale_order_id, input.userId, "customer_refund_created", refund.id, payment.id, { amount: fromMinorUnits(amountCents), currency: payment.currency, reason });
        return { type: "success", refundId: refund.id, status: "PENDING", amount: fromMinorUnits(amountCents), currency: payment.currency };
      });
  }

  async postRefund(input: { refundId: string; userId: string; companyPaymentAccountId: string; operationNumber: string; idempotencyKey: string }) {
    await this.requirePermission(input.userId, "customer_refunds.post");
    const operationNumber = input.operationNumber?.trim() ?? "";
    if (!operationNumber || operationNumber.length > 100) throw new BadRequestException("El número de operación del reembolso es obligatorio y debe tener como máximo 100 caracteres.");
    return this.runIdempotent(`refund-post:${input.userId}:${input.refundId}`, input.idempotencyKey,
      { refundId: input.refundId, companyPaymentAccountId: input.companyPaymentAccountId, operationNumber }, async (manager) => {
        const [identity] = await manager.query<any[]>(`SELECT client_id FROM customer_refunds WHERE id = $1`, [input.refundId]);
        if (!identity) throw new NotFoundException("No se encontró el reembolso.");
        await manager.query(`SELECT id FROM clients WHERE id = $1 FOR UPDATE`, [identity.client_id]);
        const [refund] = await manager.query<any[]>(
          `SELECT cr.*, sp.sale_order_id FROM customer_refunds cr JOIN sale_payments sp ON sp.id = cr.sale_payment_id
           WHERE cr.id = $1 FOR UPDATE OF cr, sp`, [input.refundId],
        );
        if (!refund) throw new NotFoundException("No se encontró el reembolso.");
        if (refund.status !== "PENDING") throw new ConflictException("Solo se puede confirmar un reembolso pendiente.");
        const permissions = await this.accessControl.getEffectivePermissions(input.userId);
        if (refund.created_by_user_id === input.userId && !permissions.includes("*") && !permissions.includes("customer_refunds.post_own")) {
          throw new ForbiddenException({ code: "REFUND_SELF_APPROVAL_FORBIDDEN", message: "El usuario que registró el reembolso no puede confirmarlo sin el permiso excepcional." });
        }
        const [account] = await manager.query<any[]>(
          `SELECT company_payment_account_id, currency, usage, is_active FROM company_payment_accounts
           WHERE company_payment_account_id = $1
             AND ($2::uuid IS NULL OR company_id = $2)
           FOR UPDATE`, [input.companyPaymentAccountId, await this.companyScopeId(manager, input.userId)],
        );
        if (!account || !account.is_active || !["OUTFLOW", "BOTH"].includes(account.usage) || account.currency !== refund.currency) {
          throw new ConflictException({ code: "REFUND_ACCOUNT_INVALID", message: "Selecciona una cuenta activa de salida en la misma moneda del reembolso." });
        }
        await manager.query(
          `UPDATE customer_refunds SET company_payment_account_id = $2, operation_number = $3,
             status = 'POSTED', posted_by_user_id = $4, posted_at = now() WHERE id = $1 AND status = 'PENDING'`,
          [refund.id, account.company_payment_account_id, operationNumber, input.userId],
        );
        await manager.query(
          `INSERT INTO financial_account_movements
             (company_payment_account_id, sale_payment_id, refund_id, movement_type, amount, currency, operation_date, created_by_user_id, reason)
           VALUES ($1, NULL, $2, 'REFUND', $3, $4::currency_type, CURRENT_DATE, $5, $6)`,
          [account.company_payment_account_id, refund.id, fromMinorUnits(-toMinorUnits(refund.amount)), refund.currency, input.userId, refund.reason],
        );
        await this.writeRefundAuditAndOutbox(manager, refund.sale_order_id, input.userId, "customer_refund_posted", refund.id, refund.sale_payment_id,
          { amount: Number(refund.amount), currency: refund.currency, operationNumber });
        return { type: "success", refundId: refund.id, status: "POSTED", amount: Number(refund.amount), currency: refund.currency };
      });
  }

  async cancelRefund(input: { refundId: string; userId: string; reason: string; idempotencyKey: string }) {
    await this.requirePermission(input.userId, "customer_refunds.cancel");
    const reason = input.reason?.trim() ?? "";
    if (reason.length < 5 || reason.length > 500) throw new BadRequestException("El motivo debe tener entre 5 y 500 caracteres.");
    return this.runIdempotent(`refund-cancel:${input.userId}:${input.refundId}`, input.idempotencyKey,
      { refundId: input.refundId, reason }, async (manager) => {
        const [identity] = await manager.query<any[]>(`SELECT client_id FROM customer_refunds WHERE id = $1`, [input.refundId]);
        if (!identity) throw new NotFoundException("No se encontró el reembolso.");
        await manager.query(`SELECT id FROM clients WHERE id = $1 FOR UPDATE`, [identity.client_id]);
        const [refund] = await manager.query<any[]>(
          `SELECT cr.*, sp.sale_order_id FROM customer_refunds cr JOIN sale_payments sp ON sp.id = cr.sale_payment_id
           WHERE cr.id = $1 FOR UPDATE OF cr, sp`, [input.refundId],
        );
        if (!refund) throw new NotFoundException("No se encontró el reembolso.");
        if (refund.status !== "PENDING") throw new ConflictException("Solo se puede cancelar un reembolso pendiente.");
        await manager.query(`UPDATE customer_refunds SET status = 'CANCELLED' WHERE id = $1 AND status = 'PENDING'`, [refund.id]);
        await manager.query(
          `INSERT INTO customer_credit_movements
             (client_id, sale_payment_id, source_sale_order_id, movement_type, amount, currency, created_by_user_id, reason)
           VALUES ($1, $2, $3, 'REFUND', $4, $5::currency_type, $6, $7)`,
          [refund.client_id, refund.sale_payment_id, refund.sale_order_id, fromMinorUnits(toMinorUnits(refund.amount)), refund.currency, input.userId, `Reserva de reembolso cancelada: ${reason}`],
        );
        await this.writeRefundAuditAndOutbox(manager, refund.sale_order_id, input.userId, "customer_refund_cancelled", refund.id, refund.sale_payment_id, { amount: Number(refund.amount), reason });
        return { type: "success", refundId: refund.id, status: "CANCELLED" };
      });
  }

  async reverseRefund(input: { refundId: string; userId: string; reason: string; idempotencyKey: string }) {
    await this.requirePermission(input.userId, "customer_refunds.reverse");
    const reason = input.reason?.trim() ?? "";
    if (reason.length < 5 || reason.length > 500) throw new BadRequestException("El motivo debe tener entre 5 y 500 caracteres.");
    return this.runIdempotent(`refund-reverse:${input.userId}:${input.refundId}`, input.idempotencyKey,
      { refundId: input.refundId, reason }, async (manager) => {
        const [identity] = await manager.query<any[]>(`SELECT client_id FROM customer_refunds WHERE id = $1`, [input.refundId]);
        if (!identity) throw new NotFoundException("No se encontró el reembolso.");
        await manager.query(`SELECT id FROM clients WHERE id = $1 FOR UPDATE`, [identity.client_id]);
        const [refund] = await manager.query<any[]>(
          `SELECT cr.*, sp.sale_order_id FROM customer_refunds cr JOIN sale_payments sp ON sp.id = cr.sale_payment_id
           WHERE cr.id = $1 FOR UPDATE OF cr, sp`, [input.refundId],
        );
        if (!refund) throw new NotFoundException("No se encontró el reembolso.");
        if (refund.status !== "POSTED") throw new ConflictException("Solo se puede revertir un reembolso contabilizado.");
        const [movement] = await manager.query<any[]>(
          `SELECT * FROM financial_account_movements WHERE refund_id = $1 AND movement_type = 'REFUND' FOR UPDATE`, [refund.id],
        );
        if (!movement) throw new ConflictException({ code: "REFUND_MOVEMENT_MISSING", message: "No se encontró la salida original del reembolso." });
        await manager.query(
          `INSERT INTO financial_account_movements
             (company_payment_account_id, sale_payment_id, refund_id, reverses_movement_id, movement_type, amount, currency, operation_date, created_by_user_id, reason)
           VALUES ($1, NULL, $2, $3, 'REFUND_REVERSAL', $4, $5::currency_type, CURRENT_DATE, $6, $7)`,
          [movement.company_payment_account_id, refund.id, movement.id, fromMinorUnits(toMinorUnits(refund.amount)), refund.currency, input.userId, reason],
        );
        await manager.query(`UPDATE customer_refunds SET status = 'REVERSED', reversed_by_user_id = $2, reversed_at = now() WHERE id = $1 AND status = 'POSTED'`, [refund.id, input.userId]);
        await manager.query(
          `INSERT INTO customer_credit_movements
             (client_id, sale_payment_id, source_sale_order_id, movement_type, amount, currency, created_by_user_id, reason)
           VALUES ($1, $2, $3, 'REFUND', $4, $5::currency_type, $6, $7)`,
          [refund.client_id, refund.sale_payment_id, refund.sale_order_id, fromMinorUnits(toMinorUnits(refund.amount)), refund.currency, input.userId, `Reversión de reembolso: ${reason}`],
        );
        await this.writeRefundAuditAndOutbox(manager, refund.sale_order_id, input.userId, "customer_refund_reversed", refund.id, refund.sale_payment_id, { amount: Number(refund.amount), reason });
        return { type: "success", refundId: refund.id, status: "REVERSED" };
      });
  }

  async cancelOrReverse(input: { incomeId: string; userId: string; expectedVersion: number; reason: string; idempotencyKey: string }) {
    const reason = input.reason?.trim() ?? "";
    if (reason.length < 5 || reason.length > 500) throw new BadRequestException("El motivo debe tener entre 5 y 500 caracteres.");
    return this.runIdempotent(`close:${input.userId}:${input.incomeId}`, input.idempotencyKey, {
      incomeId: input.incomeId,
      expectedVersion: input.expectedVersion,
      reason,
    }, async (manager) => {
      const [row] = await this.lockPayments(manager, [input.incomeId]);
      if (!row) throw new NotFoundException("Ingreso no encontrado");
      if (row.version !== input.expectedVersion) throw new ConflictException("El ingreso cambió. Actualiza la información.");
      if (row.status !== "PENDING_CONFIRMATION" && row.status !== "POSTED") throw new ConflictException("El ingreso ya está cerrado.");
      if (row.status === "POSTED") {
        const sideEffects = await manager.query<any[]>(
          `SELECT
             EXISTS(SELECT 1 FROM bank_reconciliation_allocations WHERE sale_payment_id = $1 AND unreconciled_at IS NULL) AS reconciled,
             EXISTS(SELECT 1 FROM customer_refunds WHERE sale_payment_id = $1 AND status IN ('PENDING','POSTED')) AS has_refunds,
             COALESCE((SELECT SUM(amount) FROM customer_credit_movements WHERE sale_payment_id = $1), 0) AS credit_balance`,
          [row.id],
        );
        const effect = sideEffects[0];
        if (effect?.reconciled || effect?.has_refunds || toMinorUnits(effect?.credit_balance ?? 0) !== 0) {
          throw new ConflictException({ code: "INCOME_DEPENDENCIES_MUST_BE_RESOLVED", message: "Desconcilia el ingreso y resuelve sus saldos a favor o reembolsos antes de revertirlo." });
        }
        const [movement] = await manager.query<any[]>(`SELECT * FROM financial_account_movements WHERE sale_payment_id = $1 AND movement_type = 'INCOME'`, [row.id]);
        if (!movement) throw new ConflictException({ code: "ORIGINAL_MOVEMENT_MISSING", message: "No se encontró el movimiento original; revisa la conciliación financiera antes de revertir." });
        await manager.query(
          `INSERT INTO financial_account_movements
             (company_payment_account_id, sale_payment_id, reverses_movement_id, movement_type, amount, currency, operation_date, created_by_user_id, reason)
           VALUES ($1, $2, $3, 'REVERSAL', $4, $5::currency_type, CURRENT_DATE, $6, $7)`,
          [movement.company_payment_account_id, row.id, movement.id, -Number(movement.amount), row.currency, input.userId, reason],
        );
        await manager.query(
          `INSERT INTO sale_payment_allocations (sale_payment_id, sale_order_id, amount, currency, created_by_user_id)
           SELECT sale_payment_id, sale_order_id, -amount, currency, $2
           FROM sale_payment_allocations WHERE sale_payment_id = $1 AND amount > 0`,
          [row.id, input.userId],
        );
        await manager.query(
          `UPDATE sale_payments SET status = 'REVERSED', reversed_at = now(), reversed_by_user_id = $2,
             voided_at = now(), voided_by_user_id = $2, void_reason = $3, financial_reason = $3, version = version + 1
           WHERE id = $1 AND status = 'POSTED' AND version = $4`,
          [row.id, input.userId, reason, row.version],
        );
        const orderId = row.sale_order_id;
        await this.writeAuditAndOutbox(manager, orderId, input.userId, "payment_reversed", row.id, { status: "REVERSED", reason });
        return { type: "success", incomeId: row.id, status: "REVERSED" };
      }
      await manager.query(
        `UPDATE sale_payments SET status = 'CANCELLED', cancelled_at = now(), cancelled_by_user_id = $2,
           voided_at = now(), voided_by_user_id = $2, void_reason = $3, financial_reason = $3, version = version + 1
         WHERE id = $1 AND status = 'PENDING_CONFIRMATION' AND version = $4`,
        [row.id, input.userId, reason, row.version],
      );
      await this.writeAuditAndOutbox(manager, row.sale_order_id, input.userId, "payment_cancelled", row.id, { status: "CANCELLED", reason });
      return { type: "success", incomeId: row.id, status: "CANCELLED" };
    });
  }

  async reenter(input: {
    incomeId: string; userId: string; reason: string; idempotencyKey: string;
    amount: number; date: string; paymentMethodId: string; companyPaymentAccountId: string;
    operationNumber: string | null; note: string | null;
  }) {
    const reason = input.reason?.trim() ?? "";
    if (reason.length < 5 || reason.length > 500) throw new BadRequestException("El motivo de reingreso debe tener entre 5 y 500 caracteres.");
    let amountCents: number;
    try { amountCents = toMinorUnits(input.amount); }
    catch (error) { throw new BadRequestException(error instanceof Error ? error.message : "Importe inválido"); }
    if (amountCents <= 0) throw new BadRequestException("El monto debe ser mayor que cero.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date) || Number.isNaN(Date.parse(`${input.date}T00:00:00Z`))) throw new BadRequestException("La fecha de pago debe ser válida.");
    const operationNumber = input.operationNumber?.trim() || null;
    if (operationNumber && operationNumber.length > 100) throw new BadRequestException("El número de operación no puede superar 100 caracteres.");
    if (input.note && input.note.trim().length > 255) throw new BadRequestException("La descripción no puede superar 255 caracteres.");
    const request = { incomeId: input.incomeId, reason, amount: amountCents, date: input.date, paymentMethodId: input.paymentMethodId, companyPaymentAccountId: input.companyPaymentAccountId, operationNumber, note: input.note?.trim() || null };
    return this.runIdempotent(`reenter:${input.userId}:${input.incomeId}`, input.idempotencyKey, request, async (manager) => {
      const [source] = await this.lockPayments(manager, [input.incomeId]);
      if (!source || !["CANCELLED", "REVERSED"].includes(source.status)) throw new ConflictException("Solo puedes reingresar un ingreso cancelado o revertido.");
      const [order] = await manager.query<any[]>(`SELECT so.currency, so.is_active, UPPER(COALESCE(sos.code, '')) AS state_code
        FROM sale_orders so LEFT JOIN workflow_states ws ON ws.id = so.current_state_id
        LEFT JOIN sale_order_states sos ON sos.id = ws.sale_order_state_id WHERE so.id = $1 FOR UPDATE OF so`, [source.sale_order_id]);
      if (!order || !order.is_active || order.state_code === "CANCELLED") throw new ConflictException("El pedido está cancelado, archivado o ya no existe.");
      const methodId = input.paymentMethodId;
      const accountId = input.companyPaymentAccountId;
      const [method] = await manager.query<any[]>(`SELECT is_active, code, name, requires_operation_reference FROM payment_methods WHERE method_id = $1`, [methodId]);
      if (!method?.is_active) throw new BadRequestException("Selecciona un método de pago activo.");
      const companyId = await this.companyScopeId(manager, input.userId);
      const [account] = await manager.query<any[]>(`SELECT currency, usage, is_active, type FROM company_payment_accounts
        WHERE company_payment_account_id = $1 AND ($2::uuid IS NULL OR company_id = $2) FOR UPDATE`, [accountId, companyId]);
      if (!account?.is_active || !["INFLOW", "BOTH"].includes(account.usage) || account.currency !== order.currency) throw new BadRequestException("Selecciona una cuenta receptora activa y compatible con el pedido.");
      if (!isCompanyPaymentAccountCompatible(method.code, account.type)) throw new BadRequestException("La cuenta receptora no es compatible con el método de pago.");
      if (method.requires_operation_reference && !operationNumber) throw new BadRequestException("Este método de pago requiere un nuevo número de operación.");
      const paymentDate = input.date;
      const amount = amountCents;
      try {
        const [copy] = await manager.query<any[]>(
          `INSERT INTO sale_payments
           (sale_order_id, date, payment_date, method, operation_number, operation_code, amount, note,
            company_payment_account_id, payment_method_id, currency, status, version, created_by_user_id,
            reentered_from_payment_id, financial_reason)
         VALUES ($1, $2::timestamptz, $3::date, $4, $5, $5, $6, $7, $8, $9, $10::currency_type,
                 'PENDING_CONFIRMATION', 1, $11, $12, $13)
         RETURNING id, version, status`,
          [source.sale_order_id, `${paymentDate}T00:00:00-05:00`, paymentDate, method.name, operationNumber, fromMinorUnits(amount), input.note?.trim() || null, accountId, methodId, order.currency, input.userId, source.id, reason],
        );
        await this.writeAuditAndOutbox(manager, source.sale_order_id, input.userId, "payment_reentered", copy.id, { sourceIncomeId: source.id, status: "PENDING_CONFIRMATION", reason });
        return { type: "success", incomeId: copy.id, sourceIncomeId: source.id, status: copy.status, version: copy.version };
      } catch (error: any) {
        if (error?.code === "23505") throw new ConflictException({ code: "DUPLICATE_OPERATION_NUMBER", message: "Ese número de operación ya está registrado." });
        throw error;
      }
    });
  }

  private async validateForPosting(manager: EntityManager, row: PaymentRow, userId: string, expectedVersion?: number) {
    const errors: { code: string; message: string } | null = row.status !== "PENDING_CONFIRMATION"
      ? { code: "INCOME_NOT_PENDING", message: "El ingreso ya no está por confirmar." }
      : toMinorUnits(row.amount) <= 0
        ? { code: "INVALID_AMOUNT", message: "El monto debe ser mayor que cero." }
        : expectedVersion !== undefined && row.version !== expectedVersion
          ? { code: "VERSION_CONFLICT", message: "El ingreso cambió mientras se revisaba." }
          : null;
    if (errors) return { error: errors, warnings: [] as Array<{ code: string; message: string }> };
    if (row.created_by_user_id === userId || row.updated_by_user_id === userId) {
      const permissions = await this.accessControl.getEffectivePermissions(userId);
      if (!permissions.includes("*") && !permissions.includes("sale_orders.payments.post_own")) {
        return { error: { code: "SAME_USER_APPROVAL_BLOCKED", message: "No puedes contabilizar un ingreso que registraste o editaste." }, warnings: [] };
      }
    }
    const orderRows = await manager.query<any[]>(
      `SELECT so.total, so.currency, so.client_id, so.is_active,
              UPPER(COALESCE(sos.code, '')) AS state_code,
              COALESCE((SELECT SUM(sp2.amount) FROM sale_payments sp2 WHERE sp2.sale_order_id = so.id AND sp2.id <> $2 AND sp2.status IN ('POSTED','PENDING_CONFIRMATION')), 0)::numeric(14,2) AS active_total
       FROM sale_orders so
       LEFT JOIN workflow_states ws ON ws.id = so.current_state_id
       LEFT JOIN sale_order_states sos ON sos.id = ws.sale_order_state_id
       WHERE so.id = $1`,
      [row.sale_order_id, row.id],
    );
    if (!orderRows.length) return { error: { code: "SALE_ORDER_NOT_FOUND", message: "El pedido asociado ya no existe." }, warnings: [] };
    const order = orderRows[0];
    if (!order.is_active || order.state_code === "CANCELLED") return { error: { code: "SALE_ORDER_NOT_POSTABLE", message: "No se puede contabilizar en un pedido cancelado o archivado." }, warnings: [] };
    if (row.currency !== order.currency) return { error: { code: "CURRENCY_MISMATCH", message: "La moneda del ingreso debe coincidir con la del pedido." }, warnings: [] };
    const companyId = await this.companyScopeId(manager, userId);
    const accountRows = row.company_payment_account_id ? await manager.query<any[]>(
      `SELECT currency, usage, is_active FROM company_payment_accounts
       WHERE company_payment_account_id = $1
         AND ($2::uuid IS NULL OR company_id = $2)`,
      [row.company_payment_account_id, companyId],
    ) : [];
    if (!accountRows.length || !accountRows[0].is_active || !["INFLOW", "BOTH"].includes(accountRows[0].usage) || accountRows[0].currency !== row.currency) {
      return { error: { code: "RECEIVER_ACCOUNT_INVALID", message: "La cuenta receptora no está activa o no admite ingresos en esta moneda." }, warnings: [] };
    }
    const methodRows = row.payment_method_id ? await manager.query<any[]>(`SELECT is_active FROM payment_methods WHERE method_id = $1`, [row.payment_method_id]) : [];
    if (!methodRows.length || !methodRows[0].is_active) return { error: { code: "PAYMENT_METHOD_INVALID", message: "El método de pago no está activo." }, warnings: [] };
    const activeTotal = toMinorUnits(order.active_total ?? 0);
    const amount = toMinorUnits(row.amount);
    const warnings = activeTotal + amount > toMinorUnits(order.total)
      ? [{ code: "OVERPAYMENT_CONFIRMATION_REQUIRED", message: "El importe superará el total vigente y el excedente quedará como saldo a favor." }]
      : [];
    const permissions = await this.accessControl.getEffectivePermissions(userId);
    const highValue = Number(process.env.INCOME_HIGH_VALUE_THRESHOLD ?? 0);
    if (highValue > 0 && amount > toMinorUnits(highValue) && !permissions.includes("*") && !permissions.includes("sale_orders.payments.post_high_value")) {
      return { error: { code: "HIGH_VALUE_PERMISSION_REQUIRED", message: "Este ingreso supera el límite y requiere autorización para montos altos." }, warnings: [] };
    }
    return { error: null, warnings };
  }

  private async lockPayments(manager: EntityManager, ids: string[]): Promise<PaymentRow[]> {
    return manager.query<PaymentRow[]>(
      `SELECT sp.*, sp.payment_date::text AS payment_date FROM sale_payments sp
       WHERE sp.id = ANY($1::uuid[]) ORDER BY sp.id FOR UPDATE`,
      [ids],
    );
  }

  private async runIdempotent<T>(scope: string, key: string, request: unknown, action: (manager: EntityManager) => Promise<T>): Promise<T> {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(key ?? "")) throw new BadRequestException("Envía una clave de idempotencia UUID válida.");
    const requestHash = createHash("sha256").update(JSON.stringify(request)).digest("hex");
    return this.entityManager.transaction(async (manager) => {
      const inserted = await manager.query<any[]>(
        `INSERT INTO financial_idempotency_records (scope_key, idempotency_key, request_hash, status)
         VALUES ($1, $2::uuid, $3, 'IN_PROGRESS')
         ON CONFLICT (scope_key, idempotency_key) DO NOTHING RETURNING id`,
        [scope, key, requestHash],
      );
      if (!inserted.length) {
        const [prior] = await manager.query<any[]>(
          `SELECT request_hash, status, response_body FROM financial_idempotency_records
           WHERE scope_key = $1 AND idempotency_key = $2::uuid FOR UPDATE`,
          [scope, key],
        );
        if (!prior || prior.request_hash !== requestHash) throw new ConflictException({ code: "IDEMPOTENCY_KEY_REUSED", message: "La clave de idempotencia ya fue usada con otra solicitud." });
        if (prior.status === "COMPLETED") return prior.response_body as T;
        throw new ConflictException({ code: "OPERATION_IN_PROGRESS", message: "La operación sigue en curso; consulta nuevamente su resultado." });
      }
      const result = await action(manager);
      await manager.query(
        `UPDATE financial_idempotency_records SET status = 'COMPLETED', response_status = 200,
          response_body = $2::jsonb, completed_at = now() WHERE scope_key = $1 AND idempotency_key = $3::uuid`,
        [scope, JSON.stringify(result), key],
      );
      return result;
    });
  }

  private async writeAuditAndOutbox(manager: EntityManager, orderId: string, userId: string, action: string, incomeId: string, details: unknown) {
    await manager.query(`INSERT INTO sale_order_auditory (sale_order_id, executed_by, action_execution) VALUES ($1, $2, $3)`, [orderId, userId, action]);
    await manager.query(
      `INSERT INTO financial_outbox_events (event_type, aggregate_type, aggregate_id, payload)
       VALUES ($1, 'sale_payment', $2, $3::jsonb)`,
      [`income.${action}`, incomeId, JSON.stringify({ incomeId, saleOrderId: orderId, actorId: userId, details })],
    );
  }

  private async writeRefundAuditAndOutbox(manager: EntityManager, orderId: string, userId: string, action: string, refundId: string, incomeId: string, details: unknown) {
    await manager.query(`INSERT INTO sale_order_auditory (sale_order_id, executed_by, action_execution) VALUES ($1, $2, $3)`, [orderId, userId, action]);
    await manager.query(
      `INSERT INTO financial_outbox_events (event_type, aggregate_type, aggregate_id, payload)
       VALUES ($1, 'customer_refund', $2, $3::jsonb)`,
      [`income.${action}`, refundId, JSON.stringify({ refundId, incomeId, saleOrderId: orderId, actorId: userId, details })],
    );
  }

  private normalizeIds(ids: string[]) {
    const normalized = [...new Set((ids ?? []).map((id) => String(id).trim()).filter(Boolean))].sort();
    if (normalized.length !== (ids ?? []).filter(Boolean).length) throw new BadRequestException("No repitas ingresos en una misma operación.");
    return normalized;
  }

  private groupTotals(rows: Array<{ amount: number; currency: string }>) {
    const cents = new Map<string, number>();
    for (const row of rows) cents.set(row.currency, (cents.get(row.currency) ?? 0) + toMinorUnits(row.amount));
    return Object.fromEntries([...cents].map(([currency, amount]) => [currency, fromMinorUnits(amount)]));
  }
}
