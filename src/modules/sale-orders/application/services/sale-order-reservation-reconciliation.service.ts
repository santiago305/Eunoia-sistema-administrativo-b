import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { SaleOrder } from '../../domain/entities/sale-order';
import {
  SALE_ORDER_RESERVATION_TOTALS_QUERY,
  SaleOrderReservationTotalsQuery,
} from '../ports/sale-order-reservation-totals.query';
import {
  PRODUCT_CATALOG_INVENTORY_REPOSITORY,
  ProductCatalogInventoryRepository,
} from 'src/modules/product-catalog/domain/ports/inventory.repository';
import {
  INVENTORY_LOCK,
  InventoryLock,
} from 'src/modules/product-catalog/integration/inventory/ports/inventory-lock.port';
import { TransactionContext } from 'src/shared/domain/ports/unit-of-work.port';

export type SaleOrderReservationReconciliationItem = {
  stockItemId: string;
  skuCode: string;
  productName: string;
  orderQuantity: number;
  onHand: number;
  previousReserved: number;
  expectedReserved: number;
  adjustment: number;
  availableAfter: number;
  status: 'UNCHANGED' | 'COMPLETED' | 'RELEASED_EXCESS';
};

export type SaleOrderReservationReconciliationResult = {
  checked: boolean;
  adjusted: boolean;
  warehouseId: string | null;
  items: SaleOrderReservationReconciliationItem[];
};

export type SaleOrderReservationHealthStatus =
  | 'COMPLETE'
  | 'NO_RESERVATION'
  | 'INCONSISTENT'
  | 'INSUFFICIENT_STOCK';

export type SaleOrderReservationHealthItem = {
  stockItemId: string;
  skuCode: string;
  productName: string;
  orderQuantity: number;
  onHand: number;
  actualReserved: number;
  expectedReserved: number;
  difference: number;
  status: Exclude<SaleOrderReservationHealthStatus, 'NO_RESERVATION'>;
};

export type SaleOrderReservationHealthResult = {
  checked: boolean;
  status: SaleOrderReservationHealthStatus;
  warehouseId: string | null;
  items: SaleOrderReservationHealthItem[];
};

@Injectable()
export class SaleOrderReservationReconciliationService {
  constructor(
    @Inject(SALE_ORDER_RESERVATION_TOTALS_QUERY)
    private readonly expectedTotals: SaleOrderReservationTotalsQuery,
    @Inject(PRODUCT_CATALOG_INVENTORY_REPOSITORY)
    private readonly inventoryRepo: ProductCatalogInventoryRepository,
    @Inject(INVENTORY_LOCK)
    private readonly inventoryLock: InventoryLock,
  ) {}

  async inspect(
    order: Pick<SaleOrder, 'id' | 'warehouseId' | 'reserveBool'>,
    requirements: Array<{ stockItemId: string; quantity: number }>,
    tx?: TransactionContext,
  ): Promise<SaleOrderReservationHealthResult> {
    if (order.reserveBool !== true) {
      return {
        checked: true,
        status: 'NO_RESERVATION',
        warehouseId: order.warehouseId ?? null,
        items: [],
      };
    }

    if (!order.warehouseId || !requirements.length) {
      return {
        checked: false,
        status: 'INCONSISTENT',
        warehouseId: order.warehouseId ?? null,
        items: [],
      };
    }

    const orderQuantities = new Map<string, number>();
    for (const requirement of requirements) {
      const quantity = Number(requirement.quantity ?? 0);
      if (!Number.isFinite(quantity) || quantity <= 0) {
        throw new BadRequestException(
          'El pedido no tiene requisitos de stock validos y positivos',
        );
      }
      orderQuantities.set(
        requirement.stockItemId,
        (orderQuantities.get(requirement.stockItemId) ?? 0) + quantity,
      );
    }

    const stockItemIds = Array.from(orderQuantities.keys()).sort();
    const expectedRows = await this.expectedTotals.listExpected(
      { warehouseId: order.warehouseId, stockItemIds },
      tx,
    );
    const expectedByStockItem = new Map(
      expectedRows.map((row) => [row.stockItemId, row]),
    );
    const items: SaleOrderReservationHealthItem[] = [];

    for (const stockItemId of stockItemIds) {
      const expected = expectedByStockItem.get(stockItemId);
      const snapshot = await this.inventoryRepo.getSnapshot(
        {
          warehouseId: order.warehouseId,
          stockItemId,
          locationId: null,
        },
        tx,
      );
      const onHand = Number(snapshot?.onHand ?? 0);
      const actualReserved = Number(snapshot?.reserved ?? 0);
      const expectedReserved = Number(expected?.expectedReserved ?? 0);
      const orderQuantity = orderQuantities.get(stockItemId) ?? 0;
      const status: SaleOrderReservationHealthItem['status'] =
        !snapshot || expectedReserved > onHand
          ? 'INSUFFICIENT_STOCK'
          : !expected ||
              expectedReserved < orderQuantity ||
              Math.abs(actualReserved - expectedReserved) > 0.000001
            ? 'INCONSISTENT'
            : 'COMPLETE';

      items.push({
        stockItemId,
        skuCode: expected?.skuCode ?? stockItemId,
        productName: expected?.productName ?? 'Producto de stock',
        orderQuantity,
        onHand,
        actualReserved,
        expectedReserved,
        difference: expectedReserved - actualReserved,
        status,
      });
    }

    const status: SaleOrderReservationHealthStatus = items.some(
      (item) => item.status === 'INSUFFICIENT_STOCK',
    )
      ? 'INSUFFICIENT_STOCK'
      : items.some((item) => item.status === 'INCONSISTENT')
        ? 'INCONSISTENT'
        : 'COMPLETE';

    return {
      checked: true,
      status,
      warehouseId: order.warehouseId,
      items,
    };
  }

  async reconcile(
    order: Pick<SaleOrder, 'id' | 'warehouseId'>,
    requirements: Array<{ stockItemId: string; quantity: number }>,
    tx: TransactionContext,
  ): Promise<SaleOrderReservationReconciliationResult> {
    if (!order.warehouseId || !requirements.length) {
      return {
        checked: false,
        adjusted: false,
        warehouseId: order.warehouseId ?? null,
        items: [],
      };
    }

    const orderQuantities = new Map<string, number>();
    for (const requirement of requirements) {
      const quantity = Number(requirement.quantity ?? 0);
      if (!Number.isFinite(quantity) || quantity <= 0) {
        throw new BadRequestException(
          'El pedido no tiene requisitos de stock válidos y positivos',
        );
      }
      orderQuantities.set(
        requirement.stockItemId,
        (orderQuantities.get(requirement.stockItemId) ?? 0) + quantity,
      );
    }

    const stockItemIds = Array.from(orderQuantities.keys()).sort();
    const keys = stockItemIds.map((stockItemId) => ({
      warehouseId: order.warehouseId as string,
      stockItemId,
    }));
    await this.inventoryLock.lockSnapshots(keys, tx);

    const expectedRows = await this.expectedTotals.listExpected(
      { warehouseId: order.warehouseId, stockItemIds },
      tx,
    );
    const expectedByStockItem = new Map(
      expectedRows.map((row) => [row.stockItemId, row]),
    );
    const items: SaleOrderReservationReconciliationItem[] = [];

    for (const stockItemId of stockItemIds) {
      const expected = expectedByStockItem.get(stockItemId);
      if (!expected) {
        throw new BadRequestException(
          `No se encontró el producto de stock ${stockItemId}`,
        );
      }

      const snapshot = await this.inventoryRepo.getSnapshot(
        {
          warehouseId: order.warehouseId,
          stockItemId,
          locationId: null,
        },
        tx,
      );
      if (!snapshot) {
        throw new BadRequestException(
          `No existe stock para ${expected.productName} (${expected.skuCode}) en el almacén seleccionado`,
        );
      }

      const onHand = Number(snapshot.onHand ?? 0);
      const previousReserved = Number(snapshot.reserved ?? 0);
      const expectedReserved = Number(expected.expectedReserved ?? 0);
      if (expectedReserved > onHand) {
        throw new BadRequestException(
          `Stock insuficiente para completar la reserva de ${expected.productName} (${expected.skuCode}): físico ${onHand}, requerido ${expectedReserved}`,
        );
      }

      const adjustment = expectedReserved - previousReserved;
      if (adjustment !== 0) {
        await this.inventoryRepo.incrementReserved(
          {
            warehouseId: order.warehouseId,
            stockItemId,
            locationId: null,
            delta: adjustment,
          },
          tx,
        );
      }

      items.push({
        stockItemId,
        skuCode: expected.skuCode,
        productName: expected.productName,
        orderQuantity: orderQuantities.get(stockItemId) ?? 0,
        onHand,
        previousReserved,
        expectedReserved,
        adjustment,
        availableAfter: onHand - expectedReserved,
        status:
          adjustment > 0
            ? 'COMPLETED'
            : adjustment < 0
              ? 'RELEASED_EXCESS'
              : 'UNCHANGED',
      });
    }

    return {
      checked: true,
      adjusted: items.some((item) => item.adjustment !== 0),
      warehouseId: order.warehouseId,
      items,
    };
  }
}
