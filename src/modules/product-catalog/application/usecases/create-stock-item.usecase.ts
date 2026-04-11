import { Inject, Injectable, ConflictException, NotFoundException } from "@nestjs/common";
import { ProductCatalogSkuNotFoundError } from "../errors/product-catalog-sku-not-found.error";
import { ProductCatalogStockItemConflictError } from "../errors/product-catalog-stock-item-conflict.error";
import { ProductCatalogStockItem } from "../../domain/entities/stock-item";
import { PRODUCT_CATALOG_SKU_REPOSITORY, ProductCatalogSkuRepository } from "../../domain/ports/sku.repository";
import {
  PRODUCT_CATALOG_STOCK_ITEM_REPOSITORY,
  ProductCatalogStockItemRepository,
} from "../../domain/ports/stock-item.repository";

@Injectable()
export class CreateProductCatalogStockItem {
  constructor(
    @Inject(PRODUCT_CATALOG_SKU_REPOSITORY)
    private readonly skuRepo: ProductCatalogSkuRepository,
    @Inject(PRODUCT_CATALOG_STOCK_ITEM_REPOSITORY)
    private readonly stockItemRepo: ProductCatalogStockItemRepository,
  ) {}

  async execute(input: { skuId: string; isActive?: boolean }) {
    const sku = await this.skuRepo.findById(input.skuId);
    if (!sku) throw new NotFoundException(new ProductCatalogSkuNotFoundError().message);
    const exists = await this.stockItemRepo.findBySkuId(input.skuId);
    if (exists) throw new ConflictException(new ProductCatalogStockItemConflictError().message);
    return this.stockItemRepo.create(new ProductCatalogStockItem(undefined, input.skuId, input.isActive ?? true));
  }
}
