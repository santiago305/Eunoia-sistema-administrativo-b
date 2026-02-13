import { TransactionContext } from "src/modules/inventory/domain/ports/unit-of-work.port";
import { Warehouse } from "../entities/warehouse";
import { WarehouseId } from "../value-objects/warehouse-id.vo";

export const WAREHOUSE_REPOSITORY = Symbol('WAREHOUSE_REPOSITORY');
export interface WarehouseRepository{
    findById(
        warehouseId: WarehouseId,
        tx?: TransactionContext
    ):Promise<Warehouse | null>
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
            isActive?:boolean,
            name?:string,
            department?:string,
            province?:string,
            district?:string,
            address?:string,
            q?:string,
            page?:number,
            limit?:number
        }, tx?:TransactionContext
    ):Promise<{items:Warehouse[], total:number}>

}