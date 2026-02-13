import { WarehouseId } from "src/modules/warehouses/domain/value-objects/warehouse-id.vo";

export interface CreateLocationInput {
    warehouseId: WarehouseId,
    code:string,
    description?:string
}