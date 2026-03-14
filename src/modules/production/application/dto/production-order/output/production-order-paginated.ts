import { ProductionStatus } from "src/modules/production/domain/value-objects/production-status";

export interface ProductionOrderListItemOutput {
  id?: string;
  productionId?: string;
  status: ProductionStatus;
  serieId: string;
  correlative: number;
  reference: string;
  manufactureDate: Date;
  fromWarehouseId: string;
  toWarehouseId: string;
  createdAt: Date;
}

export interface PaginatedProductionOrderOutput {
  items: ProductionOrderListItemOutput[];
  total: number;
  page: number;
  limit: number;
}
