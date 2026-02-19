export interface AddProductionOrderItemInput {
  productionId: string;
  finishedVariantId: string;
  fromLocationId: string;
  toLocationId: string;
  quantity: number;
  unitCost: number;
}
