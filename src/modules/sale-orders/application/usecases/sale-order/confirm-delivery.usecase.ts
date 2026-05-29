import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { SALE_ORDER_REPOSITORY, SaleOrderRepository } from "src/modules/sale-orders/domain/ports/sale-order.repository";
import { SALE_ORDER_ITEM_REPOSITORY, SaleOrderItemRepository } from "src/modules/sale-orders/domain/ports/sale-order-item.repository";
import {
  SALE_ORDER_ITEM_COMPONENT_REPOSITORY,
  SaleOrderItemComponentRepository,
} from "src/modules/sale-orders/domain/ports/sale-order-item-component.repository";
import {
  PRODUCT_CATALOG_STOCK_ITEM_REPOSITORY,
  ProductCatalogStockItemRepository,
} from "src/modules/product-catalog/domain/ports/stock-item.repository";
import {
  PRODUCT_CATALOG_INVENTORY_REPOSITORY,
  ProductCatalogInventoryRepository,
} from "src/modules/product-catalog/domain/ports/inventory.repository";
import { INVENTORY_LOCK, InventoryLock } from "src/modules/product-catalog/integration/inventory/ports/inventory-lock.port";
import { AgendaStatus } from "src/modules/sale-orders/domain/value-objects/agenda-status";
import { DeliveryStatus } from "src/modules/sale-orders/domain/value-objects/delivery-status";
import { CLIENT_REPOSITORY, ClientRepository } from "src/modules/clients/domain/ports/client.repository";
import { ClientType } from "src/modules/clients/domain/object-values/client-type";

@Injectable()
export class ConfirmSaleOrderDeliveryUsecase {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(SALE_ORDER_REPOSITORY)
    private readonly saleOrderRepo: SaleOrderRepository,
    @Inject(SALE_ORDER_ITEM_REPOSITORY)
    private readonly saleOrderItemRepo: SaleOrderItemRepository,
    @Inject(SALE_ORDER_ITEM_COMPONENT_REPOSITORY)
    private readonly componentRepo: SaleOrderItemComponentRepository,
    @Inject(PRODUCT_CATALOG_STOCK_ITEM_REPOSITORY)
    private readonly stockItemRepo: ProductCatalogStockItemRepository,
    @Inject(PRODUCT_CATALOG_INVENTORY_REPOSITORY)
    private readonly inventoryRepo: ProductCatalogInventoryRepository,
    @Inject(INVENTORY_LOCK)
    private readonly inventoryLock: InventoryLock,
    @Inject(CLIENT_REPOSITORY)
    private readonly clientRepo: ClientRepository,
  ) {}

  async execute(input: { saleOrderId: string }) {
    return this.uow.runInTransaction(async (tx) => {
      const order = await this.saleOrderRepo.findByIdForUpdate(input.saleOrderId, tx);
      if (!order) throw new BadRequestException("Pedido no encontrado");

      if (order.deliveryStatus === DeliveryStatus.DELIVERED) {
        throw new BadRequestException("ya entregado");
      }
      if (order.agendaStatus === AgendaStatus.CANCELED || order.deliveryStatus === DeliveryStatus.CANCELED) {
        throw new BadRequestException("ya cancelado");
      }

      const items = await this.saleOrderItemRepo.listBySaleOrderId(order.id, tx);
      const itemIds = items.map((i) => i.id);
      const components = await this.componentRepo.listBySaleOrderItemIds(itemIds, tx);

      const qtyBySkuId = new Map<string, number>();
      for (const c of components) {
        qtyBySkuId.set(c.skuId, (qtyBySkuId.get(c.skuId) ?? 0) + Number(c.quantity ?? 0));
      }

      const stockItemIdBySkuId = new Map<string, string>();
      const qtyByStockItemId = new Map<string, number>();
      for (const [skuId, qty] of qtyBySkuId.entries()) {
        if (!qty) continue;
        const cached = stockItemIdBySkuId.get(skuId);
        const stockItemId = cached
          ? cached
          : await (async () => {
              const stockItem = await this.stockItemRepo.findBySkuId(skuId, tx);
              if (!stockItem) throw new BadRequestException("Stock item no encontrado para el SKU");
              stockItemIdBySkuId.set(skuId, stockItem.id);
              return stockItem.id;
            })();

        qtyByStockItemId.set(stockItemId, (qtyByStockItemId.get(stockItemId) ?? 0) + qty);
      }

      const lockKeys = Array.from(qtyByStockItemId.keys()).map((stockItemId) => ({
        warehouseId: order.warehouseId,
        stockItemId,
      }));
      if (lockKeys.length) {
        await this.inventoryLock.lockSnapshots(lockKeys, tx);
      }

      for (const [stockItemId, qty] of qtyByStockItemId.entries()) {
        if (!qty) continue;
        const snapshot = await this.inventoryRepo.getSnapshot(
          { warehouseId: order.warehouseId, stockItemId, locationId: null },
          tx,
        );
        if (!snapshot || (snapshot.reserved ?? 0) < qty || (snapshot.onHand ?? 0) < qty) {
          throw new BadRequestException("Stock insuficiente");
        }
      }

      for (const [stockItemId, qty] of qtyByStockItemId.entries()) {
        if (!qty) continue;
        await this.inventoryRepo.incrementReserved(
          { warehouseId: order.warehouseId, stockItemId, locationId: null, delta: -qty },
          tx,
        );
        await this.inventoryRepo.incrementOnHand(
          { warehouseId: order.warehouseId, stockItemId, locationId: null, delta: -qty },
          tx,
        );
      }

      const updated = await this.saleOrderRepo.updateStatuses(
        { saleOrderId: order.id, deliveryStatus: DeliveryStatus.DELIVERED },
        tx,
      );

      const deliveredOrdersCount = await this.saleOrderRepo.countSaleOrdersByClientId(order.clientId, tx);
      if (deliveredOrdersCount === 1) {
        await this.clientRepo.update({ clientId: order.clientId, type: ClientType.NEW }, tx);
      } else if (deliveredOrdersCount > 1) {
        await this.clientRepo.update({ clientId: order.clientId, type: ClientType.REPURCHASE }, tx);
      } else {
        await this.clientRepo.update({ clientId: order.clientId, type: ClientType.LAGGING }, tx);
      }

      return { saleOrderId: updated.id, deliveryStatus: updated.deliveryStatus };
    });
  }
}
