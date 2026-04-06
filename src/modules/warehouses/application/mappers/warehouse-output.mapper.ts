import { WarehouseLocation } from "../../domain/entities/warehouse-location";
import { Warehouse } from "../../domain/entities/warehouse";
import { LocationOutput } from "../dtos/location/output/location.output";
import { WarehouseOutput } from "../dtos/warehouse/output/warehouse.out";

export class WarehouseOutputMapper {
  static toWarehouseOutput(warehouse: Warehouse): WarehouseOutput {
    return {
      warehouseId: warehouse.warehouseId.value,
      name: warehouse.name,
      department: warehouse.department,
      province: warehouse.province,
      district: warehouse.district,
      address: warehouse.address,
      isActive: warehouse.isActive ?? true,
      createdAt: warehouse.createdAt,
    };
  }

  static toLocationOutput(location: WarehouseLocation): LocationOutput {
    return {
      locationId: location.locationId.value,
      warehouseId: location.warehouseId.value,
      code: location.code,
      description: location.description ?? "",
      isActive: location.isActive ?? true,
    };
  }
}
