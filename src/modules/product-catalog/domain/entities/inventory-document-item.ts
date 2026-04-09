export class ProductCatalogInventoryDocumentItem {
  constructor(
    public readonly id: string | undefined,
    public readonly docId: string,
    public readonly stockItemId: string,
    public readonly quantity: number,
    public readonly wasteQty: number,
    public readonly fromLocationId: string | null,
    public readonly toLocationId: string | null,
    public readonly unitCost: number | null,
  ) {}
}
