import { ProductType } from "src/modules/catalog/domain/value-object/productType";

export interface CreateProductInput {
  name: string;
  description?: string;
  isActive?: boolean;
  type?: ProductType;
}
