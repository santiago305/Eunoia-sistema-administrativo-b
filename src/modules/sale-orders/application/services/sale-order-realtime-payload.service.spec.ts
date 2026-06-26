import { SaleOrderRealtimePayloadService } from "./sale-order-realtime-payload.service";

describe("SaleOrderRealtimePayloadService", () => {
  it("loads unique sale orders and statistics for websocket payloads", async () => {
    const saleOrder = { id: "order-1", currentState: { code: "READY" } };
    const statistics = {
      byWorkflow: [],
      byState: [],
      byClientType: [],
      byBankAccount: [],
      totals: { orders: 1, total: 120, collected: 10, pending: 110, deliveryCostSum: 0 },
    };
    const repository = {
      findById: jest
        .fn()
        .mockResolvedValueOnce(saleOrder)
        .mockResolvedValueOnce(null),
      statistics: jest.fn().mockResolvedValue(statistics),
    };
    const service = new SaleOrderRealtimePayloadService(repository as any);

    await expect(
      service.build({
        updated: 3,
        saleOrderIds: ["order-1", "order-1", "order-2"],
        source: "automatic-workflow",
        trigger: "client-updated",
      }),
    ).resolves.toEqual({
      updated: 3,
      saleOrderIds: ["order-1", "order-2"],
      source: "automatic-workflow",
      trigger: "client-updated",
      saleOrders: [saleOrder],
      statistics,
    });

    expect(repository.findById).toHaveBeenCalledTimes(2);
    expect(repository.findById).toHaveBeenNthCalledWith(1, "order-1");
    expect(repository.findById).toHaveBeenNthCalledWith(2, "order-2");
    expect(repository.statistics).toHaveBeenCalledWith({ includeCancelled: true });
  });
});
