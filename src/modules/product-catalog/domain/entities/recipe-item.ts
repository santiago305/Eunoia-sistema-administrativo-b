export class ProductCatalogRecipeItem {
  constructor(
    public readonly id: string | undefined,
    public readonly recipeId: string,
    public readonly materialSkuId: string,
    public readonly quantity: number,
    public readonly unitId: string,
  ) {}
}
