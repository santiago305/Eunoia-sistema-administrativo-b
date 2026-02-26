export default class InventoryDocumentItem {
  constructor(
    public readonly id: string | undefined,
    public readonly docId: string,
    public readonly stockItemId: string,
    public readonly quantity: number,
    public readonly fromLocationId?: string,
    public readonly toLocationId?: string,
    public readonly unitCost?: number | null,
  ) {}
}

