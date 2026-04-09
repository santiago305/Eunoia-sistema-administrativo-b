import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { PRODUCT_CATALOG_SKU_REPOSITORY, ProductCatalogSkuRepository } from "../../domain/ports/sku.repository";

@Injectable()
export class GetProductCatalogSku {
  constructor(
    @Inject(PRODUCT_CATALOG_SKU_REPOSITORY)
    private readonly repo: ProductCatalogSkuRepository,
  ) {}

  async execute(id: string) {
    const sku = await this.repo.findById(id);
    if (!sku) throw new NotFoundException("Sku not found");
    return sku;
  }
}
