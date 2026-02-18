export class ProductRecipe{
    constructor(
        public readonly recipeId: string,
        public readonly finishedVariantId:string,
        public readonly primaVariantId:string,
        public readonly quantity:number,
        public readonly waste?:number
    ){}
}