import { ProductType } from "src/modules/catalog/domain/value-object/productType";

export type FlatCatalogItemSourceType = "PRODUCT" | "VARIANT";

export interface FlatProductOutput {
  id: string;
  sourceType: FlatCatalogItemSourceType;
  productId: string;
  baseUnitId: string;
  name: string;
  description: string | null;
  sku: string;
  customSku: string | null;
  barcode: string | null;
  price: number;
  cost: number;
  attributes: Record<string, any>;
  baseUnitName: string;
  baseUnitCode: string;
  isActive: boolean;
  type: ProductType;
  createdAt: Date;
  updatedAt: Date | null;
}
