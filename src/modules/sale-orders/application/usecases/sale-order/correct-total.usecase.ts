import { BadRequestException, Inject, Injectable } from '@nestjs/common';
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

type AmountRow = { id: string; quantity: number; total: number };

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
  }) {
    const correctedTotal = this.roundMoney(input.total);
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

      const correctedSubTotal = this.roundMoney(
        correctedTotal -
          Number(order.deliveryCost ?? 0) +
          Number(order.discount ?? 0),
      );
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

  private allocate(targetTotal: number, rows: AmountRow[]) {
    if (!rows.length) return [];
    const targetCents = Math.round(targetTotal * 100);
    const positiveTotal = rows.reduce(
      (sum, row) => sum + Math.max(Number(row.total ?? 0), 0),
      0,
    );
    const positiveQuantity = rows.reduce(
      (sum, row) => sum + Math.max(Number(row.quantity ?? 0), 0),
      0,
    );
    const weights = rows.map((row) =>
      positiveTotal > 0
        ? Math.max(Number(row.total ?? 0), 0)
        : positiveQuantity > 0
          ? Math.max(Number(row.quantity ?? 0), 0)
          : 1,
    );
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    const rawShares = weights.map(
      (weight) => (targetCents * weight) / totalWeight,
    );
    const centsByRow = rawShares.map((share) => Math.floor(share));
    const remainingCents =
      targetCents - centsByRow.reduce((sum, cents) => sum + cents, 0);
    const distributionOrder = rawShares
      .map((share, index) => ({ index, remainder: share - Math.floor(share) }))
      .sort(
        (left, right) =>
          right.remainder - left.remainder || left.index - right.index,
      );
    for (let index = 0; index < remainingCents; index += 1) {
      centsByRow[distributionOrder[index % distributionOrder.length].index] += 1;
    }

    return rows.map((row, index) => {
      const cents = centsByRow[index];
      const total = cents / 100;
      const quantity = Number(row.quantity ?? 0);
      return {
        id: row.id,
        total,
        unitPrice: this.roundMoney(quantity > 0 ? total / quantity : total),
      };
    });
  }

  private roundMoney(value: number): number {
    return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
  }
}
