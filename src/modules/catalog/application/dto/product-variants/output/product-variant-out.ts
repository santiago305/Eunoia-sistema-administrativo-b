import { ProductVariantAttributes } from "../input/attributes-product-variant";

export interface ProductVariantOutput {
  id: string | null;
  productId: string | null;
  productName?: string;
  productDescription?: string | null;
  baseUnitId?: string;
  unitCode?: string;
  unitName?: string;
  sku: string | null;
  barcode: string | null;
  attributes: ProductVariantAttributes | null;
  price: number | null;
  cost: number | null;
  isActive: boolean | null;
  createdAt?: Date | null;
}
