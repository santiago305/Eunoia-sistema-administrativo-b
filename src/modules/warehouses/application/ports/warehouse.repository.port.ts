import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { ListingSearchOptionOutput } from "src/shared/listing-search/application/dtos/listing-search-state.output";
import { Warehouse } from "../../domain/entities/warehouse";
import { WarehouseLocation } from "../../domain/entities/warehouse-location";
import { WarehouseId } from "../../domain/value-objects/warehouse-id.vo";
import { WarehouseSearchRule } from "../dtos/warehouse-search/warehouse-search-snapshot";


export const WAREHOUSE_REPOSITORY = Symbol('WAREHOUSE_REPOSITORY');
export interface WarehouseRepository{
    findById(
        warehouseId: WarehouseId,
        tx?: TransactionContext
    ):Promise<Warehouse | null>
    findByIdLocations(
        id: WarehouseId,
        tx?: TransactionContext,
    ): Promise<{ warehouse: Warehouse; items: WarehouseLocation[] } | null>;
    create(
        warehouse: Warehouse,
        tx?: TransactionContext
    ):Promise<Warehouse>;
    update( params:{
        warehouseId:WarehouseId,
        name?:string,
        department?:string,
        province?:string,
        district?:string,
        address?:string
    }, tx?:TransactionContext):Promise<Warehouse | null>;
    setActive(
        warehouseId:WarehouseId,
        isActive: boolean,
        tx?: TransactionContext
    ):Promise<void>;
    list(
        params:{
            filters?: WarehouseSearchRule[],
            q?:string,
            page?:number,
            limit?:number
        }, tx?:TransactionContext
    ):Promise<{items:Warehouse[], total:number}>
    listSearchCatalogs(tx?: TransactionContext): Promise<{
        departments: ListingSearchOptionOutput[];
        provinces: ListingSearchOptionOutput[];
        districts: ListingSearchOptionOutput[];
    }>

}
