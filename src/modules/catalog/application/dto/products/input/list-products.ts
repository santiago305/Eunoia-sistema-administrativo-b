import { ProductType } from "src/modules/catalog/domain/value-object/productType";

export interface ListProductsInput {
  isActive?: boolean;
  name?: string;
  description?: string;
  sku?: string;
  barcode?: string;
  type?: ProductType;
  q?: string;
  page?: number;
  limit?: number;
}
