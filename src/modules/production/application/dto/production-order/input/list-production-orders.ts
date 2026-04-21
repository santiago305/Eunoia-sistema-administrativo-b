import { ProductionStatus } from "src/modules/production/domain/value-objects/production-status.vo";
import { ProductionSearchRule } from "../../production-search/production-search-snapshot";

export interface ListProductionOrdersInput {
  filters?: ProductionSearchRule[];
  q?: string;
  status?: ProductionStatus;
  warehouseId?: string;
  skuId?: string;
  from?: Date;
  to?: Date;
  page?: number;
  limit?: number;
  requestedBy?: string;
}
