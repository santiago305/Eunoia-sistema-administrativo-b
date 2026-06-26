import { firstValueFrom, take } from "rxjs";
import { ClientRealtimeBridge } from "./client-realtime.bridge";

describe("ClientRealtimeBridge", () => {
  it("streams client.updated events", async () => {
    const bridge = new ClientRealtimeBridge();
    const event = {
      clientId: "client-1",
      changedFields: ["client.docNumber" as const],
      occurredAt: "2026-06-25T10:00:00.000Z",
    };

    const received = firstValueFrom(bridge.stream().pipe(take(1)));
    bridge.emitClientUpdated(event);

    await expect(received).resolves.toEqual({
      type: "client.updated",
      payload: event,
    });
  });
});
