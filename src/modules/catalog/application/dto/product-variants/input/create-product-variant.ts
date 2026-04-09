import { ProductVariantAttributes } from "./attributes-product-variant";

export interface CreateProductVariantInput {
  productId: string;
  sku?: string;
  customSku?: string | null;
  barcode?: string | null;
  attributes?: ProductVariantAttributes;
  price: number;
  cost: number;
  minStock?: number | null;
  isActive?: boolean;
}
