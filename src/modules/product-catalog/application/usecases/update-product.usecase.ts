import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import {
  PRODUCT_CATALOG_PRODUCT_REPOSITORY,
  ProductCatalogProductRepository,
} from "../../domain/ports/product.repository";

@Injectable()
export class UpdateProductCatalogProduct {
  constructor(
    @Inject(PRODUCT_CATALOG_PRODUCT_REPOSITORY)
    private readonly repo: ProductCatalogProductRepository,
  ) {}

  async execute(
    id: string,
    patch: {
      name?: string;
      description?: string | null;
      category?: string | null;
      brand?: string | null;
      baseUnitId?: string | null;
      isActive?: boolean;
    },
  ) {
    const updated = await this.repo.update(id, patch);
    if (!updated) throw new NotFoundException("Product not found");
    return updated;
  }
}
