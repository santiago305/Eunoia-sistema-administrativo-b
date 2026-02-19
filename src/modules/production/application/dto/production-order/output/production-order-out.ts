import { ProductionStatus } from "src/modules/production/domain/value-objects/production-status";

export interface ProductionOrderOutput {
  id: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  serieId: string;
  correlative: number;
  status: ProductionStatus;
  reference: string;
  manufactureTime: number;
  createdAt: Date;
}
