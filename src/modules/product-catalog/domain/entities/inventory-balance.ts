export class ProductCatalogInventoryBalance {
  constructor(
    public readonly warehouseId: string,
    public readonly stockItemId: string,
    public readonly locationId: string | null,
    public readonly onHand: number,
    public readonly reserved: number,
    public readonly available: number,
    public readonly updatedAt?: Date,
  ) {}
}
