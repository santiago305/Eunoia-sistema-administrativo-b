import { InventorySocketRealtimeService } from "./inventory-socket-realtime.service";

const createSocket = (id: string) => ({
  id,
  emit: jest.fn(),
});

describe("InventorySocketRealtimeService", () => {
  it("emits stock updates to every connected inventory socket", () => {
    const service = new InventorySocketRealtimeService();
    const socketA = createSocket("socket-a");
    const socketB = createSocket("socket-b");
    const payload = {
      warehouseId: "warehouse-1",
      stockItemId: "stock-1",
      locationId: null,
      onHand: 10,
      reserved: 2,
      available: 8,
      occurredAt: "2026-06-25T10:00:00.000Z",
    };

    service.registerConnection("user-1", socketA as any);
    service.registerConnection("user-2", socketB as any);
    service.emitToAllConnected("stock.updated", payload);

    expect(socketA.emit).toHaveBeenCalledWith("stock.updated", payload);
    expect(socketB.emit).toHaveBeenCalledWith("stock.updated", payload);
    expect(service.connectedUsersCount()).toBe(2);
    expect(service.activeConnectionsCount()).toBe(2);
  });

  it("removes disconnected sockets without removing the user's other sockets", () => {
    const service = new InventorySocketRealtimeService();
    const socketA = createSocket("socket-a");
    const socketB = createSocket("socket-b");

    service.registerConnection("user-1", socketA as any);
    service.registerConnection("user-1", socketB as any);
    service.unregisterConnection("user-1", "socket-a");
    service.emitToAllConnected("stock.updated", { stockItemId: "stock-1" });

    expect(socketA.emit).not.toHaveBeenCalled();
    expect(socketB.emit).toHaveBeenCalledWith("stock.updated", { stockItemId: "stock-1" });
    expect(service.connectedUsersCount()).toBe(1);
    expect(service.activeConnectionsCount()).toBe(1);
  });
});
