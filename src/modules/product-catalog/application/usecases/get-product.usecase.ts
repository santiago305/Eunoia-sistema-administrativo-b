import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import {
  PRODUCT_CATALOG_PRODUCT_REPOSITORY,
  ProductCatalogProductRepository,
} from "../../domain/ports/product.repository";
import { PRODUCT_CATALOG_SKU_REPOSITORY, ProductCatalogSkuRepository } from "../../domain/ports/sku.repository";
import { PRODUCT_CATALOG_UNIT_REPOSITORY, ProductCatalogUnitRepository } from "../../domain/ports/unit.repository";

@Injectable()
export class GetProductCatalogProduct {
  constructor(
    @Inject(PRODUCT_CATALOG_PRODUCT_REPOSITORY)
    private readonly productRepo: ProductCatalogProductRepository,
    @Inject(PRODUCT_CATALOG_SKU_REPOSITORY)
    private readonly skuRepo: ProductCatalogSkuRepository,
    @Inject(PRODUCT_CATALOG_UNIT_REPOSITORY)
    private readonly unitRepo: ProductCatalogUnitRepository,
  ) {}

  async execute(id: string) {
    const product = await this.productRepo.findById(id);
    if (!product) throw new NotFoundException("Product not found");
    const skus = await this.skuRepo.findByProductId(id);
    const baseUnit = product.baseUnitId ? await this.unitRepo.findById(product.baseUnitId) : null;
    return { product, baseUnit, skus };
  }
}
