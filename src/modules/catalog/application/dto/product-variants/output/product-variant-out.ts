import { ProductVariantAttributes } from "../input/attributes-product-variant";

export interface ProductVariantOutput {
  id: string;
  productId: string;
  productName?: string;
  productDescription?: string;
  baseUnitId?: string;
  unitCode?: string;
  unitName?: string;
  sku: string;
  barcode: string | null;
  attributes: ProductVariantAttributes;
  price: number;
  cost: number;
  isActive: boolean;
  createdAt?: Date;
}
