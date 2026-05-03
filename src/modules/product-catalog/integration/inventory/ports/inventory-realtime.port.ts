import { Observable } from "rxjs";

export const INVENTORY_REALTIME = Symbol("INVENTORY_REALTIME");

export type StockUpdatedEvent = {
  warehouseId: string;
  stockItemId: string;
  locationId?: string | null;
  onHand: number;
  reserved: number;
  available: number;
  documentId?: string;
  occurredAt: string;
};

export interface InventoryRealtime {
  emitStockUpdated(events: StockUpdatedEvent[]): void;
  stream(): Observable<{ type: string; payload: StockUpdatedEvent }>;
}
