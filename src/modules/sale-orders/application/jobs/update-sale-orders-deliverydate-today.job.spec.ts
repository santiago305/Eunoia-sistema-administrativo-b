import { UpdateSaleOrdersDeliveryDateTodayJob } from "./update-sale-orders-deliverydate-today.job";

describe("UpdateSaleOrdersDeliveryDateTodayJob", () => {
  it("updates eligible sale orders for today", async () => {
    const saleOrderRepo = {
      listIdsToProgramForDeliveryDate: jest.fn().mockResolvedValue(["id-1", "id-2"]),
    };
    const clock = { now: () => new Date("2026-05-28T10:00:00.000-05:00") };
    const advanceSaleOrderState = { execute: jest.fn().mockResolvedValue({}) };

    const job = new UpdateSaleOrdersDeliveryDateTodayJob(clock as any, saleOrderRepo as any, advanceSaleOrderState as any);
    const result = await job.run({ limit: 500, timeZone: "America/Lima" });

    expect(saleOrderRepo.listIdsToProgramForDeliveryDate).toHaveBeenCalledWith(
      { deliveryDate: "2026-05-28", limit: 500 },
    );
    expect(advanceSaleOrderState.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        saleOrderId: "id-1",
        transitionCode: "DELIVERY_DATE_REACHED",
      }),
    );
    expect(advanceSaleOrderState.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        saleOrderId: "id-2",
        transitionCode: "DELIVERY_DATE_REACHED",
      }),
    );
    expect(result.updated).toBe(2);
    expect(result.found).toBe(2);
    expect(result.date).toBe("2026-05-28");
    expect(result.saleOrderIds).toEqual(["id-1", "id-2"]);
  });

  it("does nothing when there are no eligible ids", async () => {
    const saleOrderRepo = {
      listIdsToProgramForDeliveryDate: jest.fn().mockResolvedValue([]),
    };
    const clock = { now: () => new Date("2026-05-28T10:00:00.000-05:00") };
    const advanceSaleOrderState = { execute: jest.fn().mockResolvedValue({}) };

    const job = new UpdateSaleOrdersDeliveryDateTodayJob(clock as any, saleOrderRepo as any, advanceSaleOrderState as any);
    const result = await job.run({ limit: 500, timeZone: "America/Lima" });

    expect(saleOrderRepo.listIdsToProgramForDeliveryDate).toHaveBeenCalled();
    expect(advanceSaleOrderState.execute).not.toHaveBeenCalled();
    expect(result.updated).toBe(0);
    expect(result.found).toBe(0);
    expect(result.saleOrderIds).toEqual([]);
  });

  it("continues when one order does not have the legacy transition", async () => {
    const saleOrderRepo = {
      listIdsToProgramForDeliveryDate: jest.fn().mockResolvedValue(["id-1", "id-2"]),
    };
    const clock = { now: () => new Date("2026-05-28T10:00:00.000-05:00") };
    const advanceSaleOrderState = {
      execute: jest.fn().mockRejectedValueOnce(new Error("Transicion no disponible")).mockResolvedValueOnce({}),
    };

    const job = new UpdateSaleOrdersDeliveryDateTodayJob(clock as any, saleOrderRepo as any, advanceSaleOrderState as any);
    const result = await job.run({ limit: 500, timeZone: "America/Lima" });

    expect(advanceSaleOrderState.execute).toHaveBeenCalledTimes(2);
    expect(result).toEqual(expect.objectContaining({ found: 2, updated: 1, failed: 1 }));
  });
});
