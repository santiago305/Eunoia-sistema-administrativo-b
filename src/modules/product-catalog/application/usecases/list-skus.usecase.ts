import { Inject, Injectable } from "@nestjs/common";
import { PRODUCT_CATALOG_SKU_REPOSITORY, ProductCatalogSkuRepository } from "../../domain/ports/sku.repository";
import { ProductCatalogProductType } from "../../domain/value-objects/product-type";

@Injectable()
export class ListProductCatalogSkus {
  constructor(
    @Inject(PRODUCT_CATALOG_SKU_REPOSITORY)
    private readonly repo: ProductCatalogSkuRepository,
  ) {}

  execute(params: { page?: number; limit?: number; q?: string; isActive?: boolean; productId?: string; productType?: ProductCatalogProductType }) {
    return this.repo.list({
      page: params.page ?? 1,
      limit: params.limit ?? 10,
      q: params.q,
      isActive: params.isActive,
      productId: params.productId,
      productType: params.productType,
    });
  }
}
