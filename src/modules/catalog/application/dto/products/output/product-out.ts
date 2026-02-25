import { ProductType } from "src/modules/catalog/domain/value-object/productType";

export interface ProductOutput {
  id: string;
  baseUnitId: string;
  name: string;
  description: string | null;
  sku: string;
  barcode: string | null;
  price: number;
  cost: number;
  attributes: Record<string, any>;
  baseUnitName?: string;
  baseUnitCode?: string;
  isActive: boolean;
  type: ProductType;
  createdAt: Date;
  updatedAt: Date;
}
