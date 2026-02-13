import { WarehouseId } from "src/modules/warehouses/domain/value-objects/warehouse-id.vo"

export interface SetActiveWarehouse{
    warehouseId: WarehouseId,
    isActive: boolean
}