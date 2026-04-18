import { ProductionStatus } from "src/modules/production/domain/value-objects/production-status.vo";

export interface ListProductionOrdersInput {
  status?: ProductionStatus;
  warehouseId?: string;
  skuId?: string;
  from?: Date;
  to?: Date;
  page?: number;
  limit?: number;
}
