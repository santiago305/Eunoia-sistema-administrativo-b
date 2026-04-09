export class ProductCatalogStockItem {
  constructor(
    public readonly id: string | undefined,
    public readonly skuId: string,
    public readonly isActive: boolean,
    public readonly createdAt?: Date,
  ) {}
}
