import { LocationId } from "src/modules/warehouses/domain/value-objects/location-id.vo";
import { WarehouseId } from "src/modules/warehouses/domain/value-objects/warehouse-id.vo";

export interface UpdateLocationInput{
    locationId:LocationId,
    warehouseId?:WarehouseId,
    code?:string,
    description?:string
}