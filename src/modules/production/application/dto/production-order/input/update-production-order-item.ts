export interface UpdateProductionOrderItemInput {
  productionId: string;
  itemId: string;
  finishedItemId?: string;
  fromLocationId?: string;
  toLocationId?: string;
  quantity?: number;
  unitCost?: number;
}
