import { ProductionStatus } from "src/modules/production/domain/value-objects/production-status";

export interface ListProductionOrdersInput {
  status?: ProductionStatus;
  warehouseId?: string;
  from?: Date;
  to?: Date;
  page?: number;
  limit?: number;
}
