import { ProductVariantAttributes } from "./attributes-product-variant";

export interface UpdateProductVariantInput {
  id: string;
  sku?: string;
  barcode?: string | null;
  attributes?: ProductVariantAttributes;
  price?: number;
  cost?: number;
}
