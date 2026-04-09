export class ProductCatalogProduct {
  constructor(
    public readonly id: string | undefined,
    public readonly name: string,
    public readonly description: string | null,
    public readonly category: string | null,
    public readonly brand: string | null,
    public readonly baseUnitId: string | null,
    public readonly isActive: boolean,
    public readonly createdAt?: Date,
    public readonly updatedAt?: Date,
  ) {}
}
