import { ProductType } from "src/modules/catalog/domain/value-object/productType";

export interface ProductOutput {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  type?: ProductType;
  createdAt: Date;
  updatedAt: Date;
}
