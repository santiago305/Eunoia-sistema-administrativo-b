import { ProductType } from "src/modules/catalog/domain/value-object/productType";

export interface ProductOutput {
  id: string;
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
  baseUnitName?: string;
  baseUnitCode?: string;
  isActive: boolean;
  type: ProductType;
  createdAt: Date;
  updatedAt: Date;
}
