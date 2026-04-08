import { StockItemType } from "src/modules/inventory/domain/value-objects/stock-item-type";

export interface ListProductRecipeInput {
  finishedType: StockItemType;
  finishedItemId: string;
}
