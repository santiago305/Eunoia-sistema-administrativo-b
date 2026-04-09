import { ProductType } from "src/modules/catalog/domain/value-object/productType";

export type FlatCatalogItemSourceType = "PRODUCT" | "VARIANT";

export interface FlatProductOutput {
  id: string;
  sourceType: FlatCatalogItemSourceType;
  familyProductId: string;
  productId: string;
  parentProductId: string | null;
  isGroupRoot: boolean;
  isOperationalItem: boolean;
  displayName: string;
  hasVariants: boolean;
  variantsCount: number;
  baseUnitId: string;
  name: string;
  description: string | null;
  sku: string;
  customSku: string | null;
  barcode: string | null;
  price: number;
  cost: number;
  minStock: number | null;
  attributes: Record<string, any>;
  baseUnitName: string;
  baseUnitCode: string;
  isActive: boolean;
  type: ProductType;
  createdAt: Date;
  updatedAt: Date | null;
}
