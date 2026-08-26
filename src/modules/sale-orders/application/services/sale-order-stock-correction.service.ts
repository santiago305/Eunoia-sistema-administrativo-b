import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { SaleOrder } from '../../domain/entities/sale-order';
import { SaleOrderStockStatus } from './sale-order-edit-policy.service';
import { SaleOrderStockRequirementsService } from 'src/modules/workflow/application/services/sale-order-stock-requirements.service';
import { SaleOrderStockConsumptionReversalService } from 'src/modules/workflow/application/services/sale-order-stock-consumption-reversal.service';
import { SaleOrderStockConsumptionService } from 'src/modules/workflow/application/services/sale-order-stock-consumption.service';
import {
  PRODUCT_CATALOG_INVENTORY_REPOSITORY,
  ProductCatalogInventoryRepository,
} from 'src/modules/product-catalog/domain/ports/inventory.repository';
import {
  INVENTORY_LOCK,
  InventoryLock,
} from 'src/modules/product-catalog/integration/inventory/ports/inventory-lock.port';
import {
  SALE_ORDER_REPOSITORY,
  SaleOrderRepository,
} from '../../domain/ports/sale-order.repository';
import { TransactionContext } from 'src/shared/domain/ports/transaction-context.port';

@Injectable()
export class SaleOrderStockCorrectionService {
  constructor(
    private readonly requirements: SaleOrderStockRequirementsService,
    private readonly consumptionReversal: SaleOrderStockConsumptionReversalService,
    private readonly consumption: SaleOrderStockConsumptionService,
    @Inject(PRODUCT_CATALOG_INVENTORY_REPOSITORY)
    private readonly inventoryRepo: ProductCatalogInventoryRepository,
    @Inject(INVENTORY_LOCK)
    private readonly inventoryLock: InventoryLock,
    @Inject(SALE_ORDER_REPOSITORY)
    private readonly saleOrderRepo: SaleOrderRepository,
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
    await this.changeReservation(order, previousRequirements, 'RELEASE', tx);
    await this.saleOrderRepo.setReserveBool(
      { saleOrderId: order.id, reserveBool: false },
      tx,
    );
    await this.saleOrderRepo.markStockReverted(order.id, tx);
    return true;
  }

  async reserveCorrectedComposition(
    order: SaleOrder,
    tx: TransactionContext,
  ): Promise<void> {
    if (!order.warehouseId) {
      throw new BadRequestException(
        'El pedido no tiene almacén para reservar la composición corregida',
      );
    }
    const correctedRequirements = await this.requirements.resolve(order, tx);
    await this.changeReservation(order, correctedRequirements, 'RESERVE', tx);
    await this.saleOrderRepo.setReserveBool(
      { saleOrderId: order.id, reserveBool: true },
      tx,
    );
  }

  async releaseCurrentReservation(
    order: SaleOrder,
    tx: TransactionContext,
  ): Promise<void> {
    if (order.reserveBool !== true) return;
    const currentRequirements = await this.requirements.resolve(order, tx);
    await this.changeReservation(order, currentRequirements, 'RELEASE', tx);
    await this.saleOrderRepo.setReserveBool(
      { saleOrderId: order.id, reserveBool: false },
      tx,
    );
    await this.saleOrderRepo.markStockReverted(order.id, tx);
  }

  async consumeCorrectedComposition(
    order: SaleOrder,
    tx: TransactionContext,
  ): Promise<void> {
    const correctedRequirements = await this.requirements.resolve(order, tx);
    await this.consumption.consume(order, correctedRequirements, tx);
    await this.saleOrderRepo.setReserveBool(
      { saleOrderId: order.id, reserveBool: false },
      tx,
    );
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

  private async changeReservation(
    order: SaleOrder,
    requirements: Array<{ stockItemId: string; quantity: number }>,
    direction: 'RELEASE' | 'RESERVE',
    tx: TransactionContext,
  ): Promise<void> {
    if (!order.warehouseId || !requirements.length) return;
    const keys = requirements
      .map(({ stockItemId }) => ({
        warehouseId: order.warehouseId as string,
        stockItemId,
      }))
      .sort((left, right) =>
        `${left.warehouseId}:${left.stockItemId}`.localeCompare(
          `${right.warehouseId}:${right.stockItemId}`,
        ),
      );
    await this.inventoryLock.lockSnapshots(keys, tx);

    for (const requirement of requirements) {
      const snapshot = await this.inventoryRepo.getSnapshot(
        {
          warehouseId: order.warehouseId,
          stockItemId: requirement.stockItemId,
          locationId: null,
        },
        tx,
      );
      if (!snapshot) {
        throw new BadRequestException('Stock no encontrado');
      }
      const quantity = Number(requirement.quantity ?? 0);
      if (direction === 'RELEASE' && Number(snapshot.reserved ?? 0) < quantity) {
        throw new BadRequestException(
          'El stock reservado anterior del pedido es inconsistente',
        );
      }
      const available = Number(
        snapshot.available ??
          Number(snapshot.onHand ?? 0) - Number(snapshot.reserved ?? 0),
      );
      if (direction === 'RESERVE' && available < quantity) {
        throw new BadRequestException(
          'Stock disponible insuficiente para la corrección del pedido',
        );
      }
      await this.inventoryRepo.incrementReserved(
        {
          warehouseId: order.warehouseId,
          stockItemId: requirement.stockItemId,
          locationId: null,
          delta: direction === 'RESERVE' ? quantity : -quantity,
        },
        tx,
      );
    }
  }
}
