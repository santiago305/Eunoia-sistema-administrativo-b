import { Injectable } from "@nestjs/common";
import { Observable, Subject } from "rxjs";
import { InventoryRealtime, StockUpdatedEvent } from "src/modules/product-catalog/integration/inventory/ports/inventory-realtime.port";

type InventoryRealtimeMessage = { type: string; payload: StockUpdatedEvent };

@Injectable()
export class InventoryRealtimeBridge implements InventoryRealtime {
  private readonly stockUpdated$ = new Subject<InventoryRealtimeMessage>();

  emitStockUpdated(events: StockUpdatedEvent[]): void {
    for (const event of events) {
      this.stockUpdated$.next({ type: "stock.updated", payload: event });
    }
  }

  stream(): Observable<InventoryRealtimeMessage> {
    return this.stockUpdated$.asObservable();
  }
}
