import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { ProductCatalogProductNotFoundError } from "../errors/product-catalog-product-not-found.error";
import { ProductCatalogProductType } from "../../domain/value-objects/product-type";
import {
  PRODUCT_CATALOG_PRODUCT_REPOSITORY,
  ProductCatalogProductRepository,
} from "../../domain/ports/product.repository";
import { normalizeProductName } from "../../domain/value-objects/product-name";

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
      type?: ProductCatalogProductType;
      brand?: string | null;
      baseUnitId?: string | null;
      isActive?: boolean;
      isDeleted?: boolean;
    },
  ) {
    const normalizedPatch = patch.name === undefined
      ? patch
      : { ...patch, name: normalizeProductName(patch.name).displayName };
    const updated = await this.repo.update(id, normalizedPatch);
    if (!updated) throw new NotFoundException(new ProductCatalogProductNotFoundError().message);
    return updated;
  }
}
