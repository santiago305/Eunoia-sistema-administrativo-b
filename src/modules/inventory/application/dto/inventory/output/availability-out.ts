export interface AvailabilityOutput {
  warehouseId: string;
  variantId: string;
  locationId?: string;
  onHand: number;
  reserved: number;
  available: number | null;
}