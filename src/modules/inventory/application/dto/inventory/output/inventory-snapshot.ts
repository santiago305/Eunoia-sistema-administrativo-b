export interface InventorySnapshotOutput {
  warehouseId: string;
  variantId: string;
  locationId?: string;
  onHand: number;
  reserved: number;
  available: number | null;
}