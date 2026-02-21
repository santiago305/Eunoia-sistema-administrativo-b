import { ProductType } from "src/modules/catalog/domain/value-object/productType";
import { ProductVariantAttributes } from "../../product-variants/input/attributes-product-variant";

export interface CreateProductInput {
  name: string;
  description?: string;
  baseUnitId: string;
  isActive?: boolean;
  type?: ProductType;
  attributes?: ProductVariantAttributes;
  price?: number;
  cost?: number;
}
