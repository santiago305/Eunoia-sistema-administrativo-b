import { ProductVariantAttributes } from "./attributes-product-variant";

export interface UpdateProductVariantInput {
  id: string;
  sku?: string;
  barcode?: string | null;
  customSku?: string | null;
  attributes?: ProductVariantAttributes;
  price?: number;
  cost?: number;
  minStock?: number | null;
}
