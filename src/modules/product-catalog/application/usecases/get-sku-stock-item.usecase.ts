import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { ProductCatalogStockItemNotFoundError } from "../errors/product-catalog-stock-item-not-found.error";
import {
  PRODUCT_CATALOG_STOCK_ITEM_REPOSITORY,
  ProductCatalogStockItemRepository,
} from "../../domain/ports/stock-item.repository";

@Injectable()
export class GetProductCatalogSkuStockItem {
  constructor(
    @Inject(PRODUCT_CATALOG_STOCK_ITEM_REPOSITORY)
    private readonly repo: ProductCatalogStockItemRepository,
  ) {}

  async execute(skuId: string) {
    const item = await this.repo.findBySkuId(skuId);
    if (!item) throw new NotFoundException(new ProductCatalogStockItemNotFoundError("Stock item not found for this sku").message);
    return item;
  }
}
