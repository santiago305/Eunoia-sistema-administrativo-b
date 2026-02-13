import { LocationId } from "../value-objects/location-id.vo";
import { WarehouseId } from "../value-objects/warehouse-id.vo";

export class WarehouseLocation{
    constructor(
        public readonly locationId: LocationId,
        public readonly warehouseId: WarehouseId,
        public readonly code: string,
        public readonly description?: string,
        public readonly isActive?:boolean
    ){}

}