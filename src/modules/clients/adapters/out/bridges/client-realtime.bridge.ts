import { Injectable } from "@nestjs/common";
import { Observable, Subject } from "rxjs";
import {
  ClientRealtime,
  ClientRealtimeMessage,
  ClientUpdatedEvent,
} from "src/modules/clients/integration/client/ports/client-realtime.port";

@Injectable()
export class ClientRealtimeBridge implements ClientRealtime {
  private readonly clientUpdated$ = new Subject<ClientRealtimeMessage>();

  emitClientUpdated(event: ClientUpdatedEvent): void {
    this.clientUpdated$.next({
      type: "client.updated",
      payload: event,
    });
  }

  stream(): Observable<ClientRealtimeMessage> {
    return this.clientUpdated$.asObservable();
  }
}
