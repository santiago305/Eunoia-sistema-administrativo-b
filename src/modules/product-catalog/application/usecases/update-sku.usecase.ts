import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { ProductCatalogSkuNotFoundError } from "../errors/product-catalog-sku-not-found.error";
import { PRODUCT_CATALOG_SKU_REPOSITORY, ProductCatalogSkuRepository, SkuAttributeInput } from "../../domain/ports/sku.repository";

@Injectable()
export class UpdateProductCatalogSku {
  constructor(
    @Inject(PRODUCT_CATALOG_SKU_REPOSITORY)
    private readonly repo: ProductCatalogSkuRepository,
  ) {}

  async execute(
    id: string,
    patch: {
      name?: string;
      barcode?: string | null;
      image?: string | null;
      price?: number;
      cost?: number;
      customSku?: string | null;
      isSellable?: boolean;
      isPurchasable?: boolean;
      isManufacturable?: boolean;
      isStockTracked?: boolean;
      isActive?: boolean;
      attributes?: SkuAttributeInput[];
    },
  ) {
    const updated = await this.repo.update(id, patch);
    if (!updated) throw new NotFoundException(new ProductCatalogSkuNotFoundError().message);
    return updated;
  }
}
