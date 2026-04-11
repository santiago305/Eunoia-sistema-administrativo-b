import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { ProductCatalogStockItemNotFoundError } from "../errors/product-catalog-stock-item-not-found.error";
import {
  PRODUCT_CATALOG_STOCK_ITEM_REPOSITORY,
  ProductCatalogStockItemRepository,
} from "../../domain/ports/stock-item.repository";

@Injectable()
export class GetProductCatalogStockItem {
  constructor(
    @Inject(PRODUCT_CATALOG_STOCK_ITEM_REPOSITORY)
    private readonly repo: ProductCatalogStockItemRepository,
  ) {}

  async execute(id: string) {
    const item = await this.repo.findById(id);
    if (!item) throw new NotFoundException(new ProductCatalogStockItemNotFoundError().message);
    return item;
  }
}
