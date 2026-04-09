import { Direction } from "src/shared/domain/value-objects/direction";

export class LedgerEntry {
  constructor(
    public readonly id: string | undefined,
    public readonly docId: string,
    public readonly docItemId: string | null,
    public readonly warehouseId: string,
    public readonly stockItemId: string,
    public readonly direction: Direction,
    public readonly quantity: number,
    public readonly unitCost: number | null = null,
    public readonly wasteQty: number | null = null,
    public readonly locationId?: string,
    public readonly createdAt?: Date,
  ) {}
}
