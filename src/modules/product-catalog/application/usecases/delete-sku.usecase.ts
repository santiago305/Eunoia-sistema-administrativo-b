import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { ProductCatalogSkuNotFoundError } from "../errors/product-catalog-sku-not-found.error";
import {
  PRODUCT_CATALOG_SKU_REPOSITORY,
  ProductCatalogSkuRepository,
} from "../../domain/ports/sku.repository";

@Injectable()
export class DeleteProductCatalogSku {
  constructor(
    @Inject(PRODUCT_CATALOG_SKU_REPOSITORY)
    private readonly repo: ProductCatalogSkuRepository,
  ) {}

  async execute(id: string): Promise<void> {
    const deleted = await this.repo.softDelete(id);
    if (!deleted) {
      throw new NotFoundException(new ProductCatalogSkuNotFoundError().message);
    }
  }
}
