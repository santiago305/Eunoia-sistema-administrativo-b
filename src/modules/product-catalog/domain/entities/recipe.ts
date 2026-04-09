export class ProductCatalogRecipe {
  constructor(
    public readonly id: string | undefined,
    public readonly skuId: string,
    public readonly version: number,
    public readonly yieldQuantity: number,
    public readonly notes: string | null,
    public readonly isActive: boolean,
    public readonly createdAt?: Date,
  ) {}
}
