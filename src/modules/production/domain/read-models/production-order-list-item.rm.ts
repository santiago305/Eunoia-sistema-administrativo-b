import { ProductionOrder } from "../entity/production-order.entity";
import { ProductionDocType } from "../value-objects/doc-type.vo";

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
  docType: ProductionDocType;
  warehouseId: string;
  nextNumber: number;
  padding: number;
  separator: string;
  isActive: boolean;
  createdAt: Date;
}

export interface ProductionOrderListItemRM {
  order: ProductionOrder;
  createdByName?: string | null;
  fromWarehouse: ProductionOrderListWarehouseRM | null;
  toWarehouse: ProductionOrderListWarehouseRM | null;
  serie: ProductionOrderListSerieRM | null;
}
