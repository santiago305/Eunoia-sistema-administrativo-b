import { ProductionStatus } from "src/modules/production/domain/value-objects/production-status";
import { ProductionOrderItemOutput } from "./production-order-item-out";

export interface ProductionOrderDetailOutput {
  id: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  serieId: string;
  correlative: number;
  status: ProductionStatus;
  reference: string;
  manufactureTime: number;
  createdAt: Date;
  items: ProductionOrderItemOutput[];
}
