export interface UpdateProductionOrderInput {
  productionId: string;
  fromWarehouseId?: string;
  toWarehouseId?: string;
  serieId?: string;
  correlative?: number;
  reference?: string;
  manufactureTime?: number;
}
