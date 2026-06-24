import { SaleOrdersGateway } from "./sale-orders.gateway";

const createClient = (userId?: string) => ({
  id: "socket-1",
  handshake: { auth: userId ? { userId } : {} },
  data: {} as Record<string, unknown>,
  disconnect: jest.fn(),
  emit: jest.fn(),
});

describe("SaleOrdersGateway", () => {
  const realtimeService = {
    registerConnection: jest.fn(),
    unregisterConnection: jest.fn(),
    logStats: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("registers connections with a userId from handshake auth", () => {
    const gateway = new SaleOrdersGateway(realtimeService as any);
    const client = createClient("user-1");

    gateway.handleConnection(client as any);

    expect(client.disconnect).not.toHaveBeenCalled();
    expect(client.data.userId).toBe("user-1");
    expect(realtimeService.registerConnection).toHaveBeenCalledWith("user-1", client);
    expect(realtimeService.logStats).toHaveBeenCalled();
  });

  it("disconnects connections without userId", () => {
    const gateway = new SaleOrdersGateway(realtimeService as any);
    const client = createClient();

    gateway.handleConnection(client as any);

    expect(client.disconnect).toHaveBeenCalledWith(true);
    expect(realtimeService.registerConnection).not.toHaveBeenCalled();
  });

  it("unregisters disconnected clients", () => {
    const gateway = new SaleOrdersGateway(realtimeService as any);
    const client = createClient("user-1");
    client.data.userId = "user-1";

    gateway.handleDisconnect(client as any);

    expect(realtimeService.unregisterConnection).toHaveBeenCalledWith("user-1", "socket-1");
    expect(realtimeService.logStats).toHaveBeenCalled();
  });

  it("responds to sale-orders ping", () => {
    const gateway = new SaleOrdersGateway(realtimeService as any);
    const client = createClient("user-1");

    gateway.handlePing(client as any, { ts: 123 });

    expect(client.emit).toHaveBeenCalledWith("sale-orders.pong", {
      ts: expect.any(Number),
      receivedTs: 123,
    });
  });
});
