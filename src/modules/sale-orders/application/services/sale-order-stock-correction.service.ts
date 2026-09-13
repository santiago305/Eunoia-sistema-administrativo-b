import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { SaleOrder } from '../../domain/entities/sale-order';
import { SaleOrderStockStatus } from './sale-order-edit-policy.service';
import { SaleOrderStockRequirementsService } from 'src/modules/workflow/application/services/sale-order-stock-requirements.service';
import { SaleOrderStockConsumptionReversalService } from 'src/modules/workflow/application/services/sale-order-stock-consumption-reversal.service';
import { SaleOrderStockConsumptionService } from 'src/modules/workflow/application/services/sale-order-stock-consumption.service';
import {
  SALE_ORDER_REPOSITORY,
  SaleOrderRepository,
} from '../../domain/ports/sale-order.repository';
import { TransactionContext } from 'src/shared/domain/ports/transaction-context.port';
import {
  SaleOrderReservationReconciliationResult,
  SaleOrderReservationReconciliationService,
} from './sale-order-reservation-reconciliation.service';

@Injectable()
export class SaleOrderStockCorrectionService {
  constructor(
    private readonly requirements: SaleOrderStockRequirementsService,
    private readonly consumptionReversal: SaleOrderStockConsumptionReversalService,
    private readonly consumption: SaleOrderStockConsumptionService,
    @Inject(SALE_ORDER_REPOSITORY)
    private readonly saleOrderRepo: SaleOrderRepository,
    private readonly reservationReconciliation: SaleOrderReservationReconciliationService,
  ) {}

  async releasePreviousComposition(
    order: SaleOrder,
    stockStatus: SaleOrderStockStatus,
    executedBy: string,
    tx: TransactionContext,
  ): Promise<boolean> {
    if (stockStatus !== 'RESERVED' && stockStatus !== 'CONSUMED') {
      return false;
    }
    if (!order.warehouseId) {
      throw new BadRequestException(
        'El pedido no tiene almacén para corregir su inventario',
      );
    }

    if (stockStatus === 'CONSUMED') {
      const restored = await this.consumptionReversal.restoreAndReserve(
        order,
        executedBy,
        tx,
      );
      if (!restored && order.reserveBool !== true) {
        throw new BadRequestException(
          'No se pudo restaurar el consumo anterior del pedido',
        );
      }
    }

    const previousRequirements = await this.requirements.resolve(order, tx);
    await this.saleOrderRepo.setReserveBool(
      { saleOrderId: order.id, reserveBool: false },
      tx,
    );
    await this.reservationReconciliation.reconcile(
      order,
      previousRequirements,
      tx,
    );
    await this.saleOrderRepo.markStockReverted(order.id, tx);
    return true;
  }

  async reserveCorrectedComposition(
    order: SaleOrder,
    tx: TransactionContext,
  ): Promise<SaleOrderReservationReconciliationResult> {
    if (!order.warehouseId) {
      throw new BadRequestException(
        'El pedido no tiene almacén para reservar la composición corregida',
      );
    }
    const correctedRequirements = await this.requirements.resolve(order, tx);
    await this.saleOrderRepo.setReserveBool(
      { saleOrderId: order.id, reserveBool: true },
      tx,
    );
    return this.reservationReconciliation.reconcile(
      order,
      correctedRequirements,
      tx,
    );
  }

  async reconcileCurrentReservation(
    order: SaleOrder,
    tx: TransactionContext,
  ): Promise<SaleOrderReservationReconciliationResult> {
    if (order.reserveBool !== true) {
      return {
        checked: false,
        adjusted: false,
        warehouseId: order.warehouseId ?? null,
        items: [],
      };
    }
    const requirements = await this.requirements.resolve(order, tx);
    return this.reservationReconciliation.reconcile(order, requirements, tx);
  }

  async releaseCurrentReservation(
    order: SaleOrder,
    tx: TransactionContext,
  ): Promise<void> {
    if (order.reserveBool !== true) return;
    const currentRequirements = await this.requirements.resolve(order, tx);
    await this.saleOrderRepo.setReserveBool(
      { saleOrderId: order.id, reserveBool: false },
      tx,
    );
    await this.reservationReconciliation.reconcile(
      order,
      currentRequirements,
      tx,
    );
    await this.saleOrderRepo.markStockReverted(order.id, tx);
  }

  async consumeCorrectedComposition(
    order: SaleOrder,
    tx: TransactionContext,
  ): Promise<void> {
    const correctedRequirements = await this.requirements.resolve(order, tx);
    await this.reservationReconciliation.reconcile(
      order,
      correctedRequirements,
      tx,
    );
    await this.consumption.consume(order, correctedRequirements, tx);
    await this.saleOrderRepo.setReserveBool(
      { saleOrderId: order.id, reserveBool: false },
      tx,
    );
  }

  async restoreConsumedAsReserved(
    order: SaleOrder,
    executedBy: string,
    tx: TransactionContext,
  ): Promise<void> {
    const restored = await this.consumptionReversal.restoreAndReserve(
      order,
      executedBy,
      tx,
    );
    if (!restored) {
      throw new BadRequestException(
        'No se pudo restaurar el consumo para mantenerlo reservado',
      );
    }
    const requirements = await this.requirements.resolve(order, tx);
    await this.reservationReconciliation.reconcile(order, requirements, tx);
  }

  async consumeCorrectedSaleOrder(
    saleOrderId: string,
    tx: TransactionContext,
  ): Promise<void> {
    const order = await this.saleOrderRepo.findByIdForUpdate(saleOrderId, tx);
    if (!order) {
      throw new BadRequestException('Pedido no encontrado');
    }
    await this.consumeCorrectedComposition(order, tx);
  }
}
