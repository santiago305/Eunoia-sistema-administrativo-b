import { ProductType } from "src/modules/catalog/domain/value-object/productType";

export interface ProductOutput {
  id: string;
  name: string;
  description: string | null;
  baseUnitId?: string;
  baseUnitName?: string;
  baseUnitCode?: string;
  cost?: number | null;
  price?: number | null;
  sku?: string | null;
  attributes?: Record<string, any> | null;
  isActive: boolean;
  type?: ProductType;
  createdAt: Date;
  updatedAt: Date;
}
