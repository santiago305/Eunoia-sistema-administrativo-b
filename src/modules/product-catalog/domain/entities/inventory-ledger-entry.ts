import { Direction } from "src/shared/domain/value-objects/direction";

export class ProductCatalogInventoryLedgerEntry {
  constructor(
    public readonly id: string | undefined,
    public readonly docId: string,
    public readonly docItemId: string | null,
    public readonly warehouseId: string,
    public readonly stockItemId: string,
    public readonly direction: Direction,
    public readonly quantity: number,
    public readonly locationId: string | null,
    public readonly wasteQty: number | null,
    public readonly unitCost: number | null,
    public readonly createdAt?: Date,
  ) {}
}

