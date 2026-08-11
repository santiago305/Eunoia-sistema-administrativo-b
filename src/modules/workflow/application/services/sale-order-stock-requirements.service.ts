import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { SaleOrder } from "src/modules/sale-orders/domain/entities/sale-order";
import {
  SALE_ORDER_ITEM_REPOSITORY,
  SaleOrderItemRepository,
} from "src/modules/sale-orders/domain/ports/sale-order-item.repository";
import {
  SALE_ORDER_ITEM_COMPONENT_REPOSITORY,
  SaleOrderItemComponentRepository,
} from "src/modules/sale-orders/domain/ports/sale-order-item-component.repository";
import {
  PRODUCT_CATALOG_STOCK_ITEM_REPOSITORY,
  ProductCatalogStockItemRepository,
} from "src/modules/product-catalog/domain/ports/stock-item.repository";
import {
  SALE_ORDER_SUPPLY_ITEM_REPOSITORY,
  SaleOrderSupplyItemRepository,
} from "src/modules/sale-orders/domain/ports/sale-order-supply-item.repository";

@Injectable()
export class SaleOrderStockRequirementsService {
  constructor(
    @Inject(SALE_ORDER_ITEM_REPOSITORY)
    private readonly itemRepo: SaleOrderItemRepository,
    @Inject(SALE_ORDER_ITEM_COMPONENT_REPOSITORY)
    private readonly componentRepo: SaleOrderItemComponentRepository,
    @Inject(PRODUCT_CATALOG_STOCK_ITEM_REPOSITORY)
    private readonly stockItemRepo: ProductCatalogStockItemRepository,
    @Inject(SALE_ORDER_SUPPLY_ITEM_REPOSITORY)
    private readonly supplyRepo: SaleOrderSupplyItemRepository,
  ) {}

  async resolve(order: SaleOrder, tx?: TransactionContext) {
    const items = await this.itemRepo.listBySaleOrderId(order.id, tx);
    const [components, supplies] = await Promise.all([
      this.componentRepo.listBySaleOrderItemIds(items.map((item) => item.id), tx),
      this.supplyRepo.listBySaleOrderId(order.id, tx),
    ]);
    const required = new Map<string, number>();

    for (const component of components) {
      const stockItem = await this.stockItemRepo.findBySkuId(component.skuId, tx);
      if (!stockItem) {
        throw new BadRequestException("Stock item no encontrado para el SKU");
      }
      required.set(stockItem.id, (required.get(stockItem.id) ?? 0) + Number(component.quantity ?? 0));
    }

    for (const supply of supplies) {
      const stockItem = await this.stockItemRepo.findBySkuId(supply.supplySkuId, tx);
      if (!stockItem) {
        throw new BadRequestException("Stock item no encontrado para el insumo");
      }
      required.set(
        stockItem.id,
        (required.get(stockItem.id) ?? 0) + Number(supply.quantity ?? 0),
      );
    }

    return Array.from(required, ([stockItemId, quantity]) => ({ stockItemId, quantity }));
  }
}
