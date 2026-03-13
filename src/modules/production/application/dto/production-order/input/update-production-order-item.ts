export interface UpdateProductionOrderItemInput {
  productionId: string;
  itemId: string;
  finishedItemId?: string;
  fromLocationId?: string | null;
  toLocationId?: string | null;
  quantity?: number;
  unitCost?: number;
}
