export interface CreateProductionOrderInput {
  fromWarehouseId: string;
  toWarehouseId: string;
  serieId: string;
  reference?: string;
  manufactureTime: number;
}
