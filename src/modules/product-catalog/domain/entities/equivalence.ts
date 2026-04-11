export class ProductCatalogEquivalence {
  constructor(
    public readonly id: string | undefined,
    public readonly productId: string,
    public readonly fromUnitId: string,
    public readonly toUnitId: string,
    public readonly factor: number,
  ) {}
}
