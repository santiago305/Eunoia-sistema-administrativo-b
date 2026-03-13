export interface AddProductionOrderItemInput {
  productionId?: string;
  finishedItemId: string;
  fromLocationId: string | null;
  toLocationId: string | null;
  quantity: number;
  unitCost: number;
  type?:string;
}
