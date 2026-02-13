export interface ListWarehousesInput{
    name?:string,
    department?:string,
    province?:string,
    district?:string,
    address?:string,
    isActive?:boolean,
    q?:string,
    page?:number,
    limit?:number
}