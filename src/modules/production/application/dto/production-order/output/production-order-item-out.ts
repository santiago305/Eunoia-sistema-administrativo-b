export interface ProductionOrderItemOutput {
  id: string;
  productionId: string;
  finishedItemId: string;
  fromLocationId: string | null;
  toLocationId: string | null;
  quantity: number;
  unitCost: number;
}
