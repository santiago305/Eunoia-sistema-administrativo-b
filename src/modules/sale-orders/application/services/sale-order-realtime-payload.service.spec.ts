import { SaleOrderRealtimePayloadService } from "./sale-order-realtime-payload.service";

describe("SaleOrderRealtimePayloadService", () => {
  it("emits only identifiers and source", async () => {
    const repository = {
      findById: jest
        .fn()
        .mockResolvedValue(null),
      statistics: jest.fn(),
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
    });

    expect(repository.findById).not.toHaveBeenCalled();
    expect(repository.statistics).not.toHaveBeenCalled();
  });
});
