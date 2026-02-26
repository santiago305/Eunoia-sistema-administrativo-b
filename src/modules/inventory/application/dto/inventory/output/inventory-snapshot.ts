export interface InventorySnapshotOutput {
  warehouseId: string;
  stockItemId: string;
  locationId?: string;
  onHand: number;
  reserved: number;
  available: number | null;
}
