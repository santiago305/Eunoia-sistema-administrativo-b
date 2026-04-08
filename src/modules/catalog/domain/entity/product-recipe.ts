import { StockItemType } from "src/modules/inventory/domain/value-objects/stock-item-type";

export class ProductRecipe{
    constructor(
        public readonly recipeId: string,
        public readonly finishedType: StockItemType,
        public readonly finishedItemId:string,
        public readonly primaVariantId:string,
        public readonly quantity:number,
        public readonly waste?:number
    ){}
}
