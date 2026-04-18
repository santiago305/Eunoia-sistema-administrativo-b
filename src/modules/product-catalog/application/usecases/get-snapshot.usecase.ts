import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { ProductCatalogStockItemNotFoundError } from "../errors/product-catalog-stock-item-not-found.error";
import { ProductCatalogInventoryBalance } from "../../domain/entities/inventory-balance";
import {
  PRODUCT_CATALOG_INVENTORY_REPOSITORY,
  ProductCatalogInventoryRepository,
} from "../../domain/ports/inventory.repository";
import {
  PRODUCT_CATALOG_STOCK_ITEM_REPOSITORY,
  ProductCatalogStockItemRepository,
} from "../../domain/ports/stock-item.repository";

@Injectable()
export class GetSnapshotInventory {
  constructor(
    @Inject(PRODUCT_CATALOG_STOCK_ITEM_REPOSITORY)
    private readonly stockItemRepo: ProductCatalogStockItemRepository,
    @Inject(PRODUCT_CATALOG_INVENTORY_REPOSITORY)
    private readonly inventoryRepo: ProductCatalogInventoryRepository,
  ) {}
  async execute(
    params: {
      warehouseId: string;
      skuId: string;
      locationId?: string;
    },
  ) {
    const stockItem = await this.stockItemRepo.findBySkuId(params.skuId);
    if (!stockItem?.id) {
      throw new NotFoundException(
        new ProductCatalogStockItemNotFoundError("Stock item not found for this sku").message,
      );
    }

    const snapshot =
      (await this.inventoryRepo.getSnapshot({
        warehouseId: params.warehouseId,
        stockItemId: stockItem.id,
        locationId: params.locationId ?? null,
      })) ??
      new ProductCatalogInventoryBalance(
        params.warehouseId,
        stockItem.id,
        params.locationId ?? null,
        0,
        0,
        0,
      );

    return snapshot;
  }
}
