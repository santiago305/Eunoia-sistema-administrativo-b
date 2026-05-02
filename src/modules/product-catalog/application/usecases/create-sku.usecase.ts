import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { ProductCatalogProductNotFoundError } from "../errors/product-catalog-product-not-found.error";
import { ProductCatalogSku } from "../../domain/entities/sku";
import {
  PRODUCT_CATALOG_PRODUCT_REPOSITORY,
  ProductCatalogProductRepository,
} from "../../domain/ports/product.repository";
import { PRODUCT_CATALOG_SKU_REPOSITORY, ProductCatalogSkuRepository, SkuAttributeInput } from "../../domain/ports/sku.repository";

@Injectable()
export class CreateProductCatalogSku {
  constructor(
    @Inject(PRODUCT_CATALOG_PRODUCT_REPOSITORY)
    private readonly productRepo: ProductCatalogProductRepository,
    @Inject(PRODUCT_CATALOG_SKU_REPOSITORY)
    private readonly skuRepo: ProductCatalogSkuRepository,
  ) {}

  async execute(input: {
    productId: string;
    customSku?: string | null;
    name: string;
    barcode?: string | null;
    image?: string | null;
    price?: number;
    cost?: number;
    isSellable?: boolean;
    isPurchasable?: boolean;
    isManufacturable?: boolean;
    isStockTracked?: boolean;
    isActive?: boolean;
    attributes?: SkuAttributeInput[];
  }) {
    const product = await this.productRepo.findById(input.productId);
    if (!product) throw new NotFoundException(new ProductCatalogProductNotFoundError().message);
    const backendSku = await this.skuRepo.reserveNextBackendSku();
    return this.skuRepo.create({
      sku: new ProductCatalogSku(
        undefined,
        input.productId,
        backendSku,
        input.customSku ?? null,
        input.name.trim(),
        input.barcode ?? null,
        input.image ?? null,
        input.price ?? 0,
        input.cost ?? 0,
        input.isSellable ?? true,
        input.isPurchasable ?? false,
        input.isManufacturable ?? false,
        input.isStockTracked ?? true,
        input.isActive ?? true,
      ),
      attributes: input.attributes ?? [],
    });
  }
}
