import { SaleOrdersRealtimeService } from "./sale-orders-realtime.service";

const createSocket = (id: string) => ({
  id,
  emit: jest.fn(),
});

describe("SaleOrdersRealtimeService", () => {
  it("emits an event to every connected sale-orders socket", () => {
    const service = new SaleOrdersRealtimeService();
    const socketA = createSocket("socket-a");
    const socketB = createSocket("socket-b");

    service.registerConnection("user-1", socketA as any);
    service.registerConnection("user-2", socketB as any);

    service.emitToAllConnected("sale-orders.updated", {
      updated: 1,
      saleOrderIds: ["order-1"],
      source: "automatic-workflow",
    });

    expect(socketA.emit).toHaveBeenCalledWith("sale-orders.updated", {
      updated: 1,
      saleOrderIds: ["order-1"],
      source: "automatic-workflow",
    });
    expect(socketB.emit).toHaveBeenCalledWith("sale-orders.updated", {
      updated: 1,
      saleOrderIds: ["order-1"],
      source: "automatic-workflow",
    });
    expect(service.connectedUsersCount()).toBe(2);
    expect(service.activeConnectionsCount()).toBe(2);
  });

  it("removes disconnected sockets without removing the user's other sockets", () => {
    const service = new SaleOrdersRealtimeService();
    const socketA = createSocket("socket-a");
    const socketB = createSocket("socket-b");

    service.registerConnection("user-1", socketA as any);
    service.registerConnection("user-1", socketB as any);
    service.unregisterConnection("user-1", "socket-a");

    service.emitToAllConnected("sale-orders.updated", {
      updated: 1,
      saleOrderIds: ["order-1"],
    });

    expect(socketA.emit).not.toHaveBeenCalled();
    expect(socketB.emit).toHaveBeenCalledWith("sale-orders.updated", {
      updated: 1,
      saleOrderIds: ["order-1"],
    });
    expect(service.connectedUsersCount()).toBe(1);
    expect(service.activeConnectionsCount()).toBe(1);
  });
});
