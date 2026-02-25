import { ProductType } from "src/modules/catalog/domain/value-object/productType";
import { ProductVariantAttributes } from "../../product-variants/input/attributes-product-variant";

export interface CreateProductInput {
  name: string;
  description?: string;
  baseUnitId: string;
  sku?: string;
  barcode?: string | null;
  price: number;
  cost: number;
  attributes?: ProductVariantAttributes;
  isActive?: boolean;
  type: ProductType;
}
