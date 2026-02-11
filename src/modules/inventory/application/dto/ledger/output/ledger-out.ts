import { Direction } from "src/modules/inventory/domain/value-objects/direction";

export interface LedgerEntryOutput {
  id: number;
  docId: string;
  warehouseId: string;
  locationId?: string;
  variantId: string;
  direction: Direction;
  quantity: number;
  unitCost?: number | null;
  createdAt?: Date;
}