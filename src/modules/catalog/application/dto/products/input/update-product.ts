import { ProductType } from "src/modules/catalog/domain/value-object/productType";
import { ProductVariantAttributes } from "../../product-variants/input/attributes-product-variant";

export interface UpdateProductInput {
  id: string;
  name?: string;
  description?: string | null;
  baseUnitId?: string;
  type?: ProductType;
  sku?: string;
  barcode?: string | null;
  attributes?: ProductVariantAttributes;
  price?: number;
  cost?: number;
}
