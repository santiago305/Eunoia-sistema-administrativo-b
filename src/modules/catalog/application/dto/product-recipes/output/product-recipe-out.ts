import { StockItemType } from "src/modules/inventory/domain/value-objects/stock-item-type";

export interface ProductRecipeOutput {
  id: string;
  finishedType: StockItemType;
  finishedItemId: string;
  primaVariantId: string;
  quantity: number;
  waste?: number;
}
