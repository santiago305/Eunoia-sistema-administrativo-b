import { ProductionStatus } from "src/modules/production/domain/value-objects/production-status.vo";

export interface ProductionOrderOutput {
  id: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  serieId: string;
  correlative: number;
  status: ProductionStatus;
  reference: string;
  manufactureDate: Date;
  createdAt: Date;
  imageProdution?: string[];
}
