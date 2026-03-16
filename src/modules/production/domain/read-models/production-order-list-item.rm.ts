import { DocType } from "src/modules/inventory/domain/value-objects/doc-type";
import { ProductionOrder } from "../entity/production-order.entity";

export interface ProductionOrderListWarehouseRM {
  id: string;
  name: string;
  department: string;
  province: string;
  district: string;
  address?: string | null;
  isActive: boolean;
  createdAt: Date;
}

export interface ProductionOrderListSerieRM {
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

export interface ProductionOrderListItemRM {
  order: ProductionOrder;
  fromWarehouse: ProductionOrderListWarehouseRM | null;
  toWarehouse: ProductionOrderListWarehouseRM | null;
  serie: ProductionOrderListSerieRM | null;
}
