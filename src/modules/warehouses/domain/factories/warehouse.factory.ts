import { WarehouseLocation } from "../entities/warehouse-location";
import { Warehouse } from "../entities/warehouse";
import { LocationId } from "../value-objects/location-id.vo";
import { WarehouseId } from "../value-objects/warehouse-id.vo";

export class WarehouseFactory {
  static createWarehouse(params: {
    warehouseId?: WarehouseId;
    name: string;
    department: string;
    province: string;
    district: string;
    address?: string;
    isActive?: boolean;
    createdAt?: Date;
  }) {
    return Warehouse.create(params);
  }

  static createLocation(params: {
    locationId?: LocationId;
    warehouseId: WarehouseId;
    code: string;
    description?: string;
    isActive?: boolean;
  }) {
    return WarehouseLocation.create(params);
  }
}
