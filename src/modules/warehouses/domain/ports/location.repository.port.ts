import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { WarehouseLocation } from "../entities/warehouse-location";
import { LocationId } from "../value-objects/location-id.vo";
import { WarehouseId } from "../value-objects/warehouse-id.vo";

export const LOCATION_REPOSITORY = Symbol('LOCATION_REPOSITORY');
export interface LocartionRepository {
    findById(
        locationId: LocationId,
        tx?: TransactionContext,
    ): Promise<WarehouseLocation | null>;

    create(
        location: WarehouseLocation, tx?:TransactionContext
    ): Promise<WarehouseLocation>;

    update(
        params:{
            locationId:LocationId,
            warehouseId?:WarehouseId,
            code?:string,
            description?:string
        },tx?:TransactionContext
    ):Promise<WarehouseLocation>;

    list(
        params:{
            warehouseId?:WarehouseId,
            code?:string,
            description?:string,
            q?:string,
            isActive?:boolean,
            page?:number,
            limit?:number
        },tx?:TransactionContext
    ):Promise<{items:WarehouseLocation[], total:number}>

    setActive(locationId: LocationId, isActive: boolean, tx?: TransactionContext): Promise<void>;
    setActiveByWarehouseId(warehouseId: WarehouseId, isActive: boolean, tx?: TransactionContext): Promise<void>;
}
