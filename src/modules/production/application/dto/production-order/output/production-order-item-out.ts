import type { StockItemType } from "src/shared/domain/value-objects/stock-item-type";

export interface ProductionOrderItemOutput {
  id: string;
  productionId: string;
  finishedItemId: string;
  finishedItemType?: StockItemType | "SKU" | null;
  fromLocationId: string | null;
  toLocationId: string | null;
  quantity: number;
  wasteQty?: number | null;
  unitCost: number;
}

