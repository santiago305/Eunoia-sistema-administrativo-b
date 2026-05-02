import { ProductionStatus } from "src/modules/production/domain/value-objects/production-status.vo";
import { ProductionDocType } from "src/modules/production/domain/value-objects/doc-type.vo";

export interface ProductionOrderListWarehouseOutput {
  id: string;
  name: string;
  department: string;
  province: string;
  district: string;
  address?: string | null;
  isActive: boolean;
  createdAt: Date;
}

export interface ProductionOrderListSerieOutput {
  id: string;
  code: string;
  name: string;
  docType: ProductionDocType;
  warehouseId: string;
  nextNumber: number;
  padding: number;
  separator: string;
  isActive: boolean;
  createdAt: Date;
}

export interface ProductionOrderListItemOutput {
  id?: string;
  productionId?: string;
  status: ProductionStatus;
  serieId: string;
  correlative: number;
  reference: string;
  manufactureDate: Date;
  createdBy: string;
  createdByName?: string | null;
  fromWarehouseId: string;
  toWarehouseId: string;
  createdAt: Date;
  imageProdution?: string[];
  fromWarehouse?: ProductionOrderListWarehouseOutput | null;
  toWarehouse?: ProductionOrderListWarehouseOutput | null;
  serie?: ProductionOrderListSerieOutput | null;
}

export interface PaginatedProductionOrderOutput {
  items: ProductionOrderListItemOutput[];
  total: number;
  page: number;
  limit: number;
}
