export class Inventory {
  constructor(
    public readonly warehouseId: string,
    public readonly variantId: string,
    public onHand: number,
    public reserved: number,
    public available: number | null,
    public readonly locationId?: string,
    public readonly updatedAt?: Date,
  ) {}

  recalcAvailable() {
    this.available = this.onHand - this.reserved;
  }
}
