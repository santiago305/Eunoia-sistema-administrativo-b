export class ProductCatalogEquivalence {
  constructor(
    public readonly id: string | undefined,
    public readonly productId: string,
    public readonly fromUnitId: string,
    public readonly toUnitId: string,
    public readonly factor: number,
    public readonly product?: { id: string; name: string } | null,
    public readonly fromUnit?: { id: string; code: string; name: string } | null,
    public readonly toUnit?: { id: string; code: string; name: string } | null,
  ) {}
}
