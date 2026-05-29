import { UpdateSaleOrdersDeliveryDateTodayJob } from "./update-sale-orders-deliverydate-today.job";
import { AgendaStatus } from "src/modules/sale-orders/domain/value-objects/agenda-status";
import { DeliveryStatus } from "src/modules/sale-orders/domain/value-objects/delivery-status";

describe("UpdateSaleOrdersDeliveryDateTodayJob", () => {
  it("updates eligible sale orders for today", async () => {
    const saleOrderRepo = {
      listIdsToProgramForDeliveryDate: jest.fn().mockResolvedValue(["id-1", "id-2"]),
      updateStatuses: jest.fn().mockResolvedValue({}),
    };
    const uow = { runInTransaction: (fn: any) => fn({}) };
    const clock = { now: () => new Date("2026-05-28T10:00:00.000-05:00") };

    const job = new UpdateSaleOrdersDeliveryDateTodayJob(uow as any, clock as any, saleOrderRepo as any);
    const result = await job.run({ limit: 500, timeZone: "America/Lima" });

    expect(saleOrderRepo.listIdsToProgramForDeliveryDate).toHaveBeenCalledWith(
      { deliveryDate: "2026-05-28", limit: 500 },
      expect.anything(),
    );
    expect(saleOrderRepo.updateStatuses).toHaveBeenCalledWith(
      { saleOrderId: "id-1", agendaStatus: AgendaStatus.PROGRAMMED, deliveryStatus: DeliveryStatus.IN_PROGRESS },
      expect.anything(),
    );
    expect(saleOrderRepo.updateStatuses).toHaveBeenCalledWith(
      { saleOrderId: "id-2", agendaStatus: AgendaStatus.PROGRAMMED, deliveryStatus: DeliveryStatus.IN_PROGRESS },
      expect.anything(),
    );
    expect(result.updated).toBe(2);
    expect(result.found).toBe(2);
    expect(result.date).toBe("2026-05-28");
    expect(result.saleOrderIds).toEqual(["id-1", "id-2"]);
  });

  it("does nothing when there are no eligible ids", async () => {
    const saleOrderRepo = {
      listIdsToProgramForDeliveryDate: jest.fn().mockResolvedValue([]),
      updateStatuses: jest.fn().mockResolvedValue({}),
    };
    const uow = { runInTransaction: (fn: any) => fn({}) };
    const clock = { now: () => new Date("2026-05-28T10:00:00.000-05:00") };

    const job = new UpdateSaleOrdersDeliveryDateTodayJob(uow as any, clock as any, saleOrderRepo as any);
    const result = await job.run({ limit: 500, timeZone: "America/Lima" });

    expect(saleOrderRepo.listIdsToProgramForDeliveryDate).toHaveBeenCalled();
    expect(saleOrderRepo.updateStatuses).not.toHaveBeenCalled();
    expect(result.updated).toBe(0);
    expect(result.found).toBe(0);
    expect(result.saleOrderIds).toEqual([]);
  });
});
