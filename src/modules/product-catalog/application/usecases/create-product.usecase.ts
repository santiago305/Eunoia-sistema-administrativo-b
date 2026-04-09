import { Inject, Injectable } from "@nestjs/common";
import { ProductCatalogProduct } from "../../domain/entities/product";
import {
  PRODUCT_CATALOG_PRODUCT_REPOSITORY,
  ProductCatalogProductRepository,
} from "../../domain/ports/product.repository";

export interface CreateProductCatalogProductInput {
  name: string;
  description?: string | null;
  category?: string | null;
  brand?: string | null;
  baseUnitId?: string | null;
  isActive?: boolean;
}

@Injectable()
export class CreateProductCatalogProduct {
  constructor(
    @Inject(PRODUCT_CATALOG_PRODUCT_REPOSITORY)
    private readonly repo: ProductCatalogProductRepository,
  ) {}

  execute(input: CreateProductCatalogProductInput) {
    return this.repo.create(
      new ProductCatalogProduct(
        undefined,
        input.name.trim(),
        input.description ?? null,
        input.category ?? null,
        input.brand ?? null,
        input.baseUnitId ?? null,
        input.isActive ?? true,
      ),
    );
  }
}
