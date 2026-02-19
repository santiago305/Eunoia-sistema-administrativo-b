export interface UpdateProductionOrderItemInput {
  productionId: string;
  itemId: string;
  finishedVariantId?: string;
  fromLocationId?: string;
  toLocationId?: string;
  quantity?: number;
  unitCost?: number;
}
