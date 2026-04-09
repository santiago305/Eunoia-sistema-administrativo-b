import { Inject, Injectable, NotFoundException } from "@nestjs/common";
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
    if (!item) throw new NotFoundException("Stock item not found for this sku");
    return item;
  }
}
