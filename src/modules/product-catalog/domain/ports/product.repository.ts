import { ProductCatalogProduct } from "../entities/product";
import { ProductCatalogProductType } from "../value-objects/product-type";

export const PRODUCT_CATALOG_PRODUCT_REPOSITORY = Symbol("PRODUCT_CATALOG_PRODUCT_REPOSITORY");

export interface ProductCatalogProductListItem {
  id: string;
  name: string;
  description: string | null;
  brand: string | null;
  baseUnitId: string | null;
  baseUnit?: string | null;
  isActive: boolean;
  skuCount: number;
  inventoryTotal: number;
}

export type ProductCatalogProductSearchField =
  | "name"
  | "description"
  | "brand"
  | "status"
  | "skuCount"
  | "inventoryTotal";

export type ProductCatalogProductSearchOperator =
  | "CONTAINS"
  | "EQ"
  | "GT"
  | "GTE"
  | "LT"
  | "LTE"
  | "IN";

export interface ProductCatalogProductSearchRule {
  field: ProductCatalogProductSearchField;
  operator: ProductCatalogProductSearchOperator;
  mode?: "include" | "exclude";
  value?: string;
  values?: string[];
}

export interface ProductCatalogProductDetail {
  id: string;
  name: string;
  description: string | null;
  type: ProductCatalogProductType;
  brand: string | null;
  isActive: boolean;
  skus: Array<{
    id: string;
    sku: string;
    name: string;
    total: number;
    inventory: Array<{
      warehouseId: string;
      warehouseName: string;
      onHand: number;
    }>;
  }>;
}

export interface ProductCatalogProductRepository {
  create(product: ProductCatalogProduct): Promise<ProductCatalogProduct>;
  update(
    id: string,
    patch: Partial<Pick<ProductCatalogProduct, "name" | "description" | "type" | "brand" | "baseUnitId" | "isActive">>,
  ): Promise<ProductCatalogProduct | null>;
  findById(id: string): Promise<ProductCatalogProduct | null>;
  getDetail(id: string, warehouseId?: string): Promise<ProductCatalogProductDetail | null>;
  list(params: {
    page: number;
    limit: number;
    q?: string;
    isActive?: boolean;
    type?: ProductCatalogProductType;
    filters?: ProductCatalogProductSearchRule[];
  }): Promise<{ items: ProductCatalogProductListItem[]; total: number; page: number; limit: number }>;
}
