import { ProductionStatus } from "src/modules/production/domain/value-objects/production-status";
import { DocType } from "src/modules/inventory/domain/value-objects/doc-type";

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
  docType: DocType;
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
  fromWarehouseId: string;
  toWarehouseId: string;
  createdAt: Date;
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
