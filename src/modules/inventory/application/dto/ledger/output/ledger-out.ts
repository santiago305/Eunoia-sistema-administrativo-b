import { Direction } from "src/modules/inventory/domain/value-objects/direction";

export interface LedgerEntryOutput {
  id: string;
  docId: string;
  warehouseId: string;
  locationId?: string;
  stockItemId: string;
  direction: Direction;
  quantity: number;
  unitCost?: number | null;
  createdAt?: Date;
}
