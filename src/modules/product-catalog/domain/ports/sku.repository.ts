import { ProductCatalogSku } from "../entities/sku";
import { ProductCatalogUnit } from "../entities/unit";
import { ProductCatalogProductType } from "../value-objects/product-type";

export interface SkuAttributeInput {
  code: string;
  name?: string | null;
  value: string;
}

export interface ProductCatalogSkuWithAttributes {
  sku: ProductCatalogSku;
  unit?: ProductCatalogUnit;
  attributes: SkuAttributeInput[];
}

export const PRODUCT_CATALOG_SKU_REPOSITORY = Symbol("PRODUCT_CATALOG_SKU_REPOSITORY");

export interface ProductCatalogSkuRepository {
  create(input: { sku: ProductCatalogSku; attributes: SkuAttributeInput[] }): Promise<ProductCatalogSkuWithAttributes>;
  update(
    id: string,
    patch: Partial<Pick<ProductCatalogSku, "name" | "barcode" | "price" | "cost" | "customSku" | "isSellable" | "isPurchasable" | "isManufacturable" | "isStockTracked" | "isActive">> & { attributes?: SkuAttributeInput[] },
  ): Promise<ProductCatalogSkuWithAttributes | null>;
  findById(id: string): Promise<ProductCatalogSkuWithAttributes | null>;
  list(params: {
    page?: number;
    limit?: number;
    q?: string;
    isActive?: boolean;
    skuId?: string;
    productId?: string;
    productType?: ProductCatalogProductType;
    warehouseId?: string;
  }): Promise<{ items: ProductCatalogSkuWithAttributes[]; total: number }>;
  findByProductId(productId: string): Promise<ProductCatalogSkuWithAttributes[]>;
  reserveNextBackendSku(): Promise<string>;
}
