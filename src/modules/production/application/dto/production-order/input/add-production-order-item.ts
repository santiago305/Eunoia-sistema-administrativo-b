export interface AddProductionOrderItemInput {
  productionId?: string;
  finishedItemId: string;
  fromLocationId: string;
  toLocationId: string;
  quantity: number;
  unitCost: number;
  type?:string;
}
