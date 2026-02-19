export class ProductionOrderItem {
    constructor(
        public readonly productionItemId:string,
        public readonly productionId:string,
        public readonly finishedVariantId:string,
        public readonly fromLocationId:string,
        public readonly toLocationId:string,
        public readonly quantity:number,
        public readonly unitCost:number
    ){}
}