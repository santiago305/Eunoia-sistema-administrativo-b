import { ProductionStatus } from "../value-objects/production-status";

export class ProductionOrder{
    constructor(
        public readonly productionId:string,
        public readonly fromWarehouseId:string,
        public readonly toWarehouseId:string,
        public readonly serieId:string,
        public readonly correlative:number,
        public readonly status: ProductionStatus,
        public readonly manufactureTime: number,
        public readonly createdBy:string,
        public readonly createdAt:Date,
        public readonly referense?:string | null,
        public readonly updateAt?:Date | null,
        public readonly updateBy?:string | null,
    ){}
}
