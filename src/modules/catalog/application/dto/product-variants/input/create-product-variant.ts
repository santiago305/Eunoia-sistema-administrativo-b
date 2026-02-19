import { ProductVariantAttributes } from "./attributes-product-variant";

export interface CreateProductVariantInput {
  productId: string;
  baseUnitId: string;
  sku?: string;
  barcode?: string | null;
  attributes?: ProductVariantAttributes;
  price: number;
  cost: number;
  isActive?: boolean;
}
