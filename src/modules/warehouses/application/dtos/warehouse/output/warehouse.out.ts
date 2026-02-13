import { WarehouseId } from "src/modules/warehouses/domain/value-objects/warehouse-id.vo";

export interface WarehouseOutput {
    warehouseId: string,
    name: string,
    department: string,
    province:string,
    district:string,
    address?:string,
    isActive:boolean,
    createdAt:Date,
}