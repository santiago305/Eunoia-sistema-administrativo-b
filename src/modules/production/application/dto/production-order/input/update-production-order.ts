import { AddProductionOrderItemInput } from "./add-production-order-item";

export interface UpdateProductionOrderInput {
  productionId: string;
  fromWarehouseId?: string;
  toWarehouseId?: string;
  serieId?: string;
  correlative?: number;
  reference?: string;
  manufactureDate?: Date;
  items: AddProductionOrderItemInput[]
}
