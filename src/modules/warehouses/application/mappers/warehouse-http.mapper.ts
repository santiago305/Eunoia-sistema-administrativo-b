import { CreateLocationInput } from "../dtos/location/input/create.input";
import { ListLocationsInput } from "../dtos/location/input/list.input";
import { SetActiveInput } from "../dtos/location/input/set-active.input";
import { UpdateLocationInput } from "../dtos/location/input/update.input";
import { CreateWarehouseInput } from "../dtos/warehouse/input/create.input";
import { ListWarehousesInput } from "../dtos/warehouse/input/list.input";
import { SetActiveWarehouse } from "../dtos/warehouse/input/set-active.input";
import { UpdateWarehouseInput } from "../dtos/warehouse/input/update.input";
import { LocationId } from "../../domain/value-objects/location-id.vo";
import { WarehouseId } from "../../domain/value-objects/warehouse-id.vo";
import { sanitizeWarehouseSearchFilters } from "../support/warehouse-search.utils";

export class WarehouseHttpMapper {
  static toCreateWarehouseInput(dto: CreateWarehouseInput): CreateWarehouseInput {
    return {
      ...dto,
      name: dto.name.trim(),
      department: dto.department.trim(),
      province: dto.province.trim(),
      district: dto.district.trim(),
      address: dto.address?.trim() || undefined,
    };
  }

  static toListWarehouseInput(input: ListWarehousesInput): ListWarehousesInput {
    return {
      ...input,
      q: input.q?.trim() || undefined,
      filters: sanitizeWarehouseSearchFilters({
        isActiveValues:
          input.isActive === undefined ? [] : [input.isActive ? "true" : "false"],
        departments: input.department?.trim() ? [input.department.trim()] : [],
        provinces: input.province?.trim() ? [input.province.trim()] : [],
        districts: input.district?.trim() ? [input.district.trim()] : [],
        name: input.name?.trim(),
        address: input.address?.trim(),
      }).concat(sanitizeWarehouseSearchFilters(input.filters)),
      name: undefined,
      department: undefined,
      province: undefined,
      district: undefined,
      address: undefined,
      isActive: undefined,
    };
  }

  static toUpdateWarehouseInput(
    warehouseId: string,
    dto: Omit<UpdateWarehouseInput, "warehouseId">,
  ): UpdateWarehouseInput {
    return {
      ...dto,
      warehouseId: new WarehouseId(warehouseId),
      name: dto.name?.trim(),
      department: dto.department?.trim(),
      province: dto.province?.trim(),
      district: dto.district?.trim(),
      address: dto.address?.trim() || undefined,
    };
  }

  static toSetWarehouseActiveInput(warehouseId: string, isActive: boolean): SetActiveWarehouse {
    return { warehouseId: new WarehouseId(warehouseId), isActive };
  }

  static toCreateLocationInput(dto: {
    warehouseId: string;
    code: string;
    description?: string;
  }): CreateLocationInput {
    return {
      warehouseId: new WarehouseId(dto.warehouseId),
      code: dto.code.trim(),
      description: dto.description?.trim() || undefined,
    };
  }

  static toListLocationInput(input: {
    page?: number;
    limit?: number;
    isActive?: boolean;
    q?: string;
    warehouseId?: string;
    code?: string;
    description?: string;
  }): ListLocationsInput {
    return {
      ...input,
      q: input.q?.trim() || undefined,
      warehouseId: input.warehouseId ? new WarehouseId(input.warehouseId) : undefined,
      code: input.code?.trim() || undefined,
      description: input.description?.trim() || undefined,
    };
  }

  static toUpdateLocationInput(
    locationId: string,
    dto: { warehouseId?: string; code?: string; description?: string },
  ): UpdateLocationInput {
    return {
      locationId: new LocationId(locationId),
      warehouseId: dto.warehouseId ? new WarehouseId(dto.warehouseId) : undefined,
      code: dto.code?.trim(),
      description: dto.description?.trim() || undefined,
    };
  }

  static toSetLocationActiveInput(locationId: string, isActive: boolean): SetActiveInput {
    return { locationId: new LocationId(locationId), isActive };
  }
}
