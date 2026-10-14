import { BadRequestException, ConflictException, Inject, Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import {
  UNIT_OF_WORK,
  UnitOfWork,
} from 'src/shared/domain/ports/unit-of-work.port';
import {
  SALE_ORDER_REPOSITORY,
  SaleOrderRepository,
} from 'src/modules/sale-orders/domain/ports/sale-order.repository';
import {
  SALE_ORDER_ITEM_REPOSITORY,
  SaleOrderItemRepository,
} from 'src/modules/sale-orders/domain/ports/sale-order-item.repository';
import {
  SALE_ORDER_ITEM_COMPONENT_REPOSITORY,
  SaleOrderItemComponentRepository,
} from 'src/modules/sale-orders/domain/ports/sale-order-item-component.repository';
import { SaleOrderPaymentWorkflowReconciliationService } from '../../services/sale-order-payment-workflow-reconciliation.service';
import { divideMoneyByQuantity, fromMinorUnits, roundMoney, toMinorUnits } from 'src/modules/sale-orders/domain/value-objects/money';

type AmountRow = { id: string; quantity: number; total: number };
type ReleasedAllocation = { paymentId: string; currency: string; amount: number };

@Injectable()
export class CorrectSaleOrderTotalUsecase {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(SALE_ORDER_REPOSITORY)
    private readonly saleOrderRepo: SaleOrderRepository,
    @Inject(SALE_ORDER_ITEM_REPOSITORY)
    private readonly itemRepo: SaleOrderItemRepository,
    @Inject(SALE_ORDER_ITEM_COMPONENT_REPOSITORY)
    private readonly componentRepo: SaleOrderItemComponentRepository,
    private readonly paymentWorkflowReconciliation: SaleOrderPaymentWorkflowReconciliationService,
  ) {}

  async execute(input: {
    saleOrderId: string;
    total: number;
    executedBy: string;
    previewToken: string;
  }) {
    const correctedTotal = roundMoney(input.total);
    if (!Number.isFinite(correctedTotal) || correctedTotal <= 0) {
      throw new BadRequestException('El total corregido debe ser mayor a 0');
    }

    return this.uow.runInTransaction(async (tx) => {
      const order = await this.saleOrderRepo.findByIdForUpdate(
        input.saleOrderId,
        tx,
      );
      if (!order || order.isActive === false) {
        throw new BadRequestException('Pedido no encontrado');
      }
      if (!order.workflowId || !order.currentStateId) {
        throw new BadRequestException('El pedido no tiene flujo asignado');
      }

      const correctedSubTotalCents =
        toMinorUnits(correctedTotal) -
        toMinorUnits(order.deliveryCost ?? 0) +
        toMinorUnits(order.discount ?? 0);
      const correctedSubTotal = fromMinorUnits(correctedSubTotalCents);
      if (correctedSubTotal < 0) {
        throw new BadRequestException(
          'El total corregido no puede ser menor que la tarifa menos el descuento',
        );
      }

      const items = await this.itemRepo.listBySaleOrderId(order.id, tx);
      if (!items.length) {
        throw new BadRequestException(
          'El pedido no tiene productos para distribuir el total',
        );
      }
      const manager = (tx as { manager?: { query?: (sql: string, params?: unknown[]) => Promise<any[]> } })?.manager;
      if (!manager?.query) throw new Error('Database transaction manager required to validate total correction preview.');
      const impact = await this.calculateReleasedAllocations(manager as { query: (sql: string, params?: unknown[]) => Promise<any[]> }, order.id, order.currency, correctedTotal, true);
      const expectedPreviewToken = this.createPreviewToken({ saleOrderId: order.id, clientId: order.clientId, currency: order.currency, currentTotal: Number(order.total ?? 0), correctedTotal, appliedCents: impact.appliedCents, allocations: impact.allocations });
      if (!input.previewToken || input.previewToken !== expectedPreviewToken) {
        throw new ConflictException('Los pagos o el total del pedido cambiaron desde la previsualización. Vuelve a analizar el impacto y confirma nuevamente.');
      }
      const itemAmounts = this.allocate(correctedSubTotal, items);
      await this.itemRepo.updateAmounts(itemAmounts, tx);

      const components = await this.componentRepo.listBySaleOrderItemIds(
        items.map((item) => item.id),
        tx,
      );
      const itemTotalById = new Map(
        itemAmounts.map((item) => [item.id, item.total]),
      );
      const componentAmounts = items.flatMap((item) => {
        const itemComponents = components.filter(
          (component) => component.saleOrderItemId === item.id,
        );
        return this.allocate(itemTotalById.get(item.id) ?? 0, itemComponents);
      });
      await this.componentRepo.updateAmounts(componentAmounts, tx);
      await this.saleOrderRepo.updateAmounts(
        {
          saleOrderId: order.id,
          subTotal: correctedSubTotal,
          total: correctedTotal,
        },
        tx,
      );

      if (correctedTotal < Number(order.total ?? 0)) {
        await this.createCreditForReleasedOrderAllocations(
          tx,
          order.id,
          order.clientId,
          input.executedBy,
          impact.allocations,
        );
      }

      return this.paymentWorkflowReconciliation.reconcile(
        {
          saleOrderId: order.id,
          executedBy: input.executedBy,
          source: 'sale-order-total-correction',
          previousTotal: Number(order.total ?? 0),
          currentTotal: correctedTotal,
          recordAuditWhenUnchanged: true,
          requireWorkflow: true,
        },
        tx,
      );
    });
  }

  async preview(input: { saleOrderId: string; total: number }) {
    const correctedTotal = roundMoney(input.total);
    if (!Number.isFinite(correctedTotal) || correctedTotal <= 0) {
      throw new BadRequestException('El total corregido debe ser mayor a 0');
    }

    return this.uow.runInTransaction(async (tx) => {
      const order = await this.saleOrderRepo.findByIdForUpdate(input.saleOrderId, tx);
      if (!order || order.isActive === false) throw new BadRequestException('Pedido no encontrado');
      if (!order.workflowId || !order.currentStateId) throw new BadRequestException('El pedido no tiene flujo asignado');
      const correctedSubTotal = fromMinorUnits(
        toMinorUnits(correctedTotal) -
        toMinorUnits(order.deliveryCost ?? 0) +
        toMinorUnits(order.discount ?? 0),
      );
      if (correctedSubTotal < 0) throw new BadRequestException('El total corregido no puede ser menor que la tarifa menos el descuento');
      if (!(await this.itemRepo.listBySaleOrderId(order.id, tx)).length) {
        throw new BadRequestException('El pedido no tiene productos para distribuir el total');
      }
      const manager = (tx as { manager?: { query?: (sql: string, params?: unknown[]) => Promise<any[]> } })?.manager;
      if (!manager?.query) throw new Error('No se encontró la transacción de base de datos para previsualizar el excedente.');
      const impact = await this.calculateReleasedAllocations(manager as { query: (sql: string, params?: unknown[]) => Promise<any[]> }, order.id, order.currency, correctedTotal, false);
      return {
        saleOrderId: order.id,
          clientId: order.clientId,
        currency: order.currency,
        currentTotal: Number(order.total ?? 0),
        correctedTotal,
        appliedAmount: fromMinorUnits(impact.appliedCents),
        pendingAmount: fromMinorUnits(Math.max(toMinorUnits(correctedTotal) - impact.appliedCents, 0)),
        customerCreditCreated: fromMinorUnits(impact.creditCents),
        releasedByIncome: impact.allocations,
        previewToken: this.createPreviewToken({ saleOrderId: order.id, clientId: order.clientId, currency: order.currency, currentTotal: Number(order.total ?? 0), correctedTotal, appliedCents: impact.appliedCents, allocations: impact.allocations }),
      };
    });
  }

  private async createCreditForReleasedOrderAllocations(
    tx: unknown,
    saleOrderId: string,
    clientId: string,
    userId: string,
    allocations: ReleasedAllocation[],
  ) {
    const manager = (tx as { manager?: { query?: (sql: string, params?: unknown[]) => Promise<any[]> } })?.manager;
    if (!manager?.query) throw new Error('No se encontró la transacción de base de datos para registrar el excedente.');
    for (const allocation of allocations) {
      await manager.query(
        `INSERT INTO sale_payment_allocations (sale_payment_id, sale_order_id, amount, currency, created_by_user_id)
         VALUES ($1, $2, $3, $4::currency_type, $5)`,
        [allocation.paymentId, saleOrderId, fromMinorUnits(-toMinorUnits(allocation.amount)), allocation.currency, userId],
      );
      await manager.query(
        `INSERT INTO customer_credit_movements
          (client_id, sale_payment_id, source_sale_order_id, movement_type, amount, currency, created_by_user_id, reason)
         VALUES ($1, $2, $3, 'CREDIT', $4, $5::currency_type, $6, 'Excedente por reducción del total del pedido')`,
        [clientId, allocation.paymentId, saleOrderId, allocation.amount, allocation.currency, userId],
      );
      await manager.query(
        `INSERT INTO sale_order_auditory (sale_order_id, executed_by, action_execution)
         VALUES ($1, $2, 'customer_credit_created_from_total_reduction')`,
        [saleOrderId, userId],
      );
      await manager.query(
        `INSERT INTO financial_outbox_events (event_type, aggregate_type, aggregate_id, payload)
         VALUES ('income.customer_credit_created', 'sale_payment', $1, $2::jsonb)`,
        [allocation.paymentId, JSON.stringify({ saleOrderId, incomeId: allocation.paymentId, actorId: userId, amount: allocation.amount, currency: allocation.currency, reason: 'Excedente por reducción del total del pedido' })],
      );
    }
  }

  private createPreviewToken(input: { saleOrderId: string; clientId: string; currency: string; currentTotal: number; correctedTotal: number; appliedCents: number; allocations: ReleasedAllocation[] }) {
    return createHash('sha256').update(JSON.stringify({
      saleOrderId: input.saleOrderId,
      clientId: input.clientId,
      currency: input.currency,
      currentTotalCents: toMinorUnits(input.currentTotal),
      correctedTotalCents: toMinorUnits(input.correctedTotal),
      appliedCents: input.appliedCents,
      allocations: input.allocations,
    })).digest('hex');
  }

  private async calculateReleasedAllocations(
    manager: { query: (sql: string, params?: unknown[]) => Promise<any[]> },
    saleOrderId: string,
    orderCurrency: string,
    correctedTotal: number,
    lockPayments: boolean,
  ) {
    const payments = await manager.query(
      `SELECT sp.id, sp.currency,
              COALESCE((SELECT SUM(spa.amount) FROM sale_payment_allocations spa
                WHERE spa.sale_payment_id = sp.id AND spa.sale_order_id = $1), 0)::numeric(14,2) AS applied
       FROM sale_payments sp
       WHERE sp.sale_order_id = $1 AND sp.status = 'POSTED'
       ORDER BY sp.created_at DESC, sp.id DESC${lockPayments ? '\n       FOR UPDATE OF sp' : ''}`,
      [saleOrderId],
    );
    if (payments.some((payment) => payment.currency !== orderCurrency)) {
      throw new BadRequestException('No se puede corregir el total: hay ingresos contabilizados en una moneda distinta a la del pedido.');
    }
    const appliedCents = payments.reduce((sum, payment) => sum + Math.max(toMinorUnits(payment.applied ?? 0), 0), 0);
    let excessCents = Math.max(appliedCents - toMinorUnits(correctedTotal), 0);
    const allocations: ReleasedAllocation[] = [];
    for (const payment of payments) {
      if (excessCents <= 0) break;
      const paymentApplied = Math.max(toMinorUnits(payment.applied ?? 0), 0);
      const releasedCents = Math.min(paymentApplied, excessCents);
      if (releasedCents <= 0) continue;
      allocations.push({ paymentId: payment.id, currency: payment.currency, amount: fromMinorUnits(releasedCents) });
      excessCents -= releasedCents;
    }
    return { appliedCents, creditCents: Math.max(appliedCents - toMinorUnits(correctedTotal), 0), allocations };
  }

  private allocate(targetTotal: number, rows: AmountRow[]) {
    if (!rows.length) return [];
    const targetCents = BigInt(toMinorUnits(targetTotal));
    const totalWeights = rows.map((row) => this.positiveWeight(row.total));
    const quantityWeights = rows.map((row) => this.positiveWeight(row.quantity));
    const hasTotalWeights = totalWeights.some((weight) => weight > 0n);
    const hasQuantityWeights = quantityWeights.some((weight) => weight > 0n);
    const weights = hasTotalWeights
      ? totalWeights
      : hasQuantityWeights
        ? quantityWeights
        : rows.map(() => 1n);
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0n);
    const shares = weights.map((weight, index) => {
      const numerator = targetCents * weight;
      return {
        index,
        cents: numerator / totalWeight,
        remainder: numerator % totalWeight,
      };
    });
    const assignedCents = shares.reduce((sum, share) => sum + share.cents, 0n);
    const remainingCents = Number(targetCents - assignedCents);
    const distributionOrder = [...shares].sort((left, right) =>
      left.remainder === right.remainder
        ? left.index - right.index
        : left.remainder > right.remainder ? -1 : 1,
    );
    for (let index = 0; index < remainingCents; index += 1) {
      shares[distributionOrder[index % distributionOrder.length].index].cents += 1n;
    }

    return rows.map((row, index) => {
      const cents = shares[index].cents;
      const total = fromMinorUnits(Number(cents));
      const quantity = Number(row.quantity ?? 0);
      return {
        id: row.id,
        total,
        unitPrice: quantity > 0 ? divideMoneyByQuantity(total, quantity) : roundMoney(total),
      };
    });
  }

  private positiveWeight(value: number | null | undefined): bigint {
    const numeric = Number(value ?? 0);
    return Number.isFinite(numeric) && numeric > 0
      ? BigInt(toMinorUnits(numeric))
      : 0n;
  }
}
