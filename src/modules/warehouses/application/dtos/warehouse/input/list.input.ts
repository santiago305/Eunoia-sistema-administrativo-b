import { WarehouseSearchRule } from "../../warehouse-search/warehouse-search-snapshot";

export interface ListWarehousesInput{
    name?:string,
    department?:string,
    province?:string,
    district?:string,
    address?:string,
    isActive?:boolean,
    q?:string,
    filters?: WarehouseSearchRule[],
    requestedBy?: string,
    page?:number,
    limit?:number
}
