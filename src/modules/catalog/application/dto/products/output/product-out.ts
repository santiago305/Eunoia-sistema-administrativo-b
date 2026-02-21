import { ProductType } from "src/modules/catalog/domain/value-object/productType";

export interface ProductOutput {
  id: string;
  baseUnitId?: string;
  primaDefaultVariantId?: string;
  name: string;
  description: string | null;
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
