import { Subject } from "rxjs";
import { StockUpdatedEvent } from "src/modules/product-catalog/integration/inventory/ports/inventory-realtime.port";
import { InventoryGateway } from "./inventory.gateway";

const createClient = (userId?: string) => ({
  id: "socket-1",
  handshake: { auth: userId ? { userId } : {} },
  data: {} as Record<string, unknown>,
  disconnect: jest.fn(),
  emit: jest.fn(),
});

const stockEvent = (): StockUpdatedEvent => ({
  warehouseId: "warehouse-1",
  stockItemId: "stock-1",
  locationId: null,
  onHand: 10,
  reserved: 2,
  available: 8,
  occurredAt: "2026-06-25T10:00:00.000Z",
});

describe("InventoryGateway", () => {
  const realtimeService = {
    registerConnection: jest.fn(),
    unregisterConnection: jest.fn(),
    emitToAllConnected: jest.fn(),
    logStats: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("registers connections with a userId from handshake auth", () => {
    const gateway = new InventoryGateway({ stream: jest.fn() } as any, realtimeService as any);
    const client = createClient("user-1");

    gateway.handleConnection(client as any);

    expect(client.disconnect).not.toHaveBeenCalled();
    expect(client.data.userId).toBe("user-1");
    expect(realtimeService.registerConnection).toHaveBeenCalledWith("user-1", client);
    expect(realtimeService.logStats).toHaveBeenCalled();
  });

  it("disconnects connections without userId", () => {
    const gateway = new InventoryGateway({ stream: jest.fn() } as any, realtimeService as any);
    const client = createClient();

    gateway.handleConnection(client as any);

    expect(client.disconnect).toHaveBeenCalledWith(true);
    expect(realtimeService.registerConnection).not.toHaveBeenCalled();
  });

  it("unregisters disconnected clients", () => {
    const gateway = new InventoryGateway({ stream: jest.fn() } as any, realtimeService as any);
    const client = createClient("user-1");
    client.data.userId = "user-1";

    gateway.handleDisconnect(client as any);

    expect(realtimeService.unregisterConnection).toHaveBeenCalledWith("user-1", "socket-1");
    expect(realtimeService.logStats).toHaveBeenCalled();
  });

  it("responds to inventory ping", () => {
    const gateway = new InventoryGateway({ stream: jest.fn() } as any, realtimeService as any);
    const client = createClient("user-1");

    gateway.handlePing(client as any, { ts: 123 });

    expect(client.emit).toHaveBeenCalledWith("inventory.pong", {
      ts: expect.any(Number),
      receivedTs: 123,
    });
  });

  it("publishes internal inventory stock updates to inventory sockets", () => {
    const inventoryStream = new Subject<{ type: string; payload: StockUpdatedEvent }>();
    const gateway = new InventoryGateway(
      { stream: jest.fn().mockReturnValue(inventoryStream.asObservable()) } as any,
      realtimeService as any,
    );
    const payload = stockEvent();

    gateway.onModuleInit();
    inventoryStream.next({ type: "stock.updated", payload });

    expect(realtimeService.emitToAllConnected).toHaveBeenCalledWith("stock.updated", payload);

    gateway.onModuleDestroy();
    expect(inventoryStream.observed).toBe(false);
  });
});
