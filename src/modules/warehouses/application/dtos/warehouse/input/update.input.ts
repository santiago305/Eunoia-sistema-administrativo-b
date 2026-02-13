import { WarehouseId } from "src/modules/warehouses/domain/value-objects/warehouse-id.vo";

export interface UpdateWarehouseInput {
    warehouseId: WarehouseId,
    name?:string,
    department?:string,
    province?:string,
    district?:string,
    address?:string
}