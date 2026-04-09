import { ProductCatalogProduct } from "../entities/product";
import { ProductCatalogProductType } from "../value-objects/product-type";

export const PRODUCT_CATALOG_PRODUCT_REPOSITORY = Symbol("PRODUCT_CATALOG_PRODUCT_REPOSITORY");

export interface ProductCatalogProductRepository {
  create(product: ProductCatalogProduct): Promise<ProductCatalogProduct>;
  update(
    id: string,
    patch: Partial<Pick<ProductCatalogProduct, "name" | "description" | "type" | "brand" | "baseUnitId" | "isActive">>,
  ): Promise<ProductCatalogProduct | null>;
  findById(id: string): Promise<ProductCatalogProduct | null>;
  list(params: {
    page: number;
    limit: number;
    q?: string;
    isActive?: boolean;
    type?: ProductCatalogProductType;
  }): Promise<{ items: ProductCatalogProduct[]; total: number }>;
}
