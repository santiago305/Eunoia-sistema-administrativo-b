import { Product } from "src/modules/catalog/domain/entity/product";
import { ProductVariant } from "src/modules/catalog/domain/entity/product-variant";

export interface ProductionOrderItemOutput {
  id: string;
  productionId: string;
  finishedItemId: string;
  finishedItem?: Product | ProductVariant;
  fromLocationId: string | null;
  toLocationId: string | null;
  quantity: number;
  unitCost: number;
}
