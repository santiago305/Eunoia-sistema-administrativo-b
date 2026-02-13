import { WarehouseId } from "../value-objects/warehouse-id.vo";

export class Warehouse{
    constructor(
       public readonly warehouseId: WarehouseId,
       public readonly name: string,
       public readonly department: string,
       public readonly province: string,
       public readonly district: string,
       public readonly address?: string,
       public readonly isActive?: boolean,
       public readonly createdAt?:Date,

    ){}
}