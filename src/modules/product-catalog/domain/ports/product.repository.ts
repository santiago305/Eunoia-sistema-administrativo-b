import { ProductCatalogProduct } from "../entities/product";
import { ProductCatalogProductType } from "../value-objects/product-type";

export const PRODUCT_CATALOG_PRODUCT_REPOSITORY = Symbol("PRODUCT_CATALOG_PRODUCT_REPOSITORY");

export interface ProductCatalogProductListItem {
  id: string;
  name: string;
  description: string | null;
  type: ProductCatalogProductType;
  brand: string | null;
  baseUnitId: string | null;
  baseUnit?: { id: string; code: string; name: string } | null;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  skuCount: number;
  inventoryTotal: number;
}

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
  }): Promise<{ items: ProductCatalogProductListItem[]; total: number; page: number; limit: number }>;
}
