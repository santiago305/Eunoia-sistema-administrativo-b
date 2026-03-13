import { AddProductionOrderItemInput } from "./add-production-order-item";

export interface CreateProductionOrderInput {
  fromWarehouseId: string;
  toWarehouseId: string;
  serieId: string;
  reference?: string;
  manufactureDate: Date;
  items: AddProductionOrderItemInput[]
}
