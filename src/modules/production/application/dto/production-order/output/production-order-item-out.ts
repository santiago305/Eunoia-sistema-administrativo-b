export interface ProductionOrderItemOutput {
  id: string;
  productionId: string;
  finishedItemId: string;
  fromLocationId: string;
  toLocationId: string;
  quantity: number;
  unitCost: number;
}
