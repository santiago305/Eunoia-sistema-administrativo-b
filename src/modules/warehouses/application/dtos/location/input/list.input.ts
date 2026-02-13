import { WarehouseId } from "src/modules/warehouses/domain/value-objects/warehouse-id.vo";

export interface ListLocationsInput {
  warehouseId?: WarehouseId;
  code?: string;
  description?: string;
  q?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}
