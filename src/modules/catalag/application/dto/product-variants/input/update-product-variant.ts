import { ProductVariantAttributes } from "./attributes-product-variant";

export interface UpdateProductVariantInput {
  id: string;
  sku?: string;
  barcode?: string;
  attributes?: ProductVariantAttributes;
  price?: number;
  cost?: number;
}
