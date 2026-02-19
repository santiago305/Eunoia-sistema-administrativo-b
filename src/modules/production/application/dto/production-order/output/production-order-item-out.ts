export interface ProductionOrderItemOutput {
  id: string;
  productionId: string;
  finishedVariantId: string;
  fromLocationId: string;
  toLocationId: string;
  quantity: number;
  unitCost: number;
}
