import { Direction } from '../value-objects/direction';

export class LedgerEntry {
  constructor(
    public readonly id: number | undefined,
    public readonly docId: string,
    public readonly warehouseId: string,
    public readonly variantId: string,
    public readonly direction: Direction,
    public readonly quantity: number,
    public readonly unitCost?: number | null,
    public readonly locationId?: string,
    public readonly createdAt?: Date,
  ) {}
}
