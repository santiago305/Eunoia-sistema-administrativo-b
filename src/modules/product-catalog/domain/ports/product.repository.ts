import { ProductCatalogProduct } from "../entities/product";

export const PRODUCT_CATALOG_PRODUCT_REPOSITORY = Symbol("PRODUCT_CATALOG_PRODUCT_REPOSITORY");

export interface ProductCatalogProductRepository {
  create(product: ProductCatalogProduct): Promise<ProductCatalogProduct>;
  update(
    id: string,
    patch: Partial<Pick<ProductCatalogProduct, "name" | "description" | "category" | "brand" | "baseUnitId" | "isActive">>,
  ): Promise<ProductCatalogProduct | null>;
  findById(id: string): Promise<ProductCatalogProduct | null>;
  list(params: { page: number; limit: number; q?: string; isActive?: boolean }): Promise<{ items: ProductCatalogProduct[]; total: number }>;
}
