import { ProductVariantAttributes } from "../input/attributes-product-variant";

export interface ProductVariantOutput {
  id: string;
  productId: string;
  baseUnitId: string;
  productName?: string;
  productDescription?: string;
  sku: string;
  barcode: string | null;
  attributes: ProductVariantAttributes;
  price: number;
  cost: number;
  isActive: boolean;
  createdAt?: Date;
}
