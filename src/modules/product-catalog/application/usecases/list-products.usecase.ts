import { Inject, Injectable } from "@nestjs/common";
import { ProductCatalogProductType } from "../../domain/value-objects/product-type";
import {
  PRODUCT_CATALOG_PRODUCT_REPOSITORY,
  ProductCatalogProductRepository,
  ProductCatalogProductSearchRule,
} from "../../domain/ports/product.repository";

@Injectable()
export class ListProductCatalogProducts {
  constructor(
    @Inject(PRODUCT_CATALOG_PRODUCT_REPOSITORY)
    private readonly repo: ProductCatalogProductRepository,
  ) {}

  execute(params: {
    page?: number;
    limit?: number;
    q?: string;
    isActive?: boolean;
    type?: ProductCatalogProductType;
    filters?: ProductCatalogProductSearchRule[];
  }) {
    return this.repo.list({
      page: params.page ?? 1,
      limit: params.limit ?? 10,
      q: params.q,
      isActive: params.isActive,
      type: params.type,
      filters: params.filters,
    });
  }
}
