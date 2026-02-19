import { ProductType } from "src/modules/catalog/domain/value-object/productType";

export interface UpdateProductInput {
  id: string;
  name?: string;
  description?: string | null;
  type?: ProductType;
}
