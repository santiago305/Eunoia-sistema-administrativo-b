import { BadRequestException, Logger } from "@nestjs/common";
import { PurchaseOrderExpectedScheduler } from "./purchase-order-expected-scheduler";
import type { RunExpectedAtUsecase } from "../usecases/purchase-order/run-expected-at.usecase";

describe("PurchaseOrderExpectedScheduler", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("logs and cleans up rejected expected-at jobs without rethrowing", async () => {
    const runExpected = {
      execute: jest
        .fn()
        .mockRejectedValue(new BadRequestException("La orden no esta en estado SENT o PARTIAL")),
    } as unknown as RunExpectedAtUsecase;
    const loggerWarn = jest.spyOn(Logger.prototype, "warn").mockImplementation();
    const scheduler = new PurchaseOrderExpectedScheduler(runExpected);

    scheduler.schedule("po-1", new Date(Date.now() + 1000));
    jest.advanceTimersByTime(1000);
    await Promise.resolve();
    await Promise.resolve();

    expect(runExpected.execute).toHaveBeenCalledWith("po-1");
    expect(loggerWarn).toHaveBeenCalledWith(
      expect.stringContaining("No se pudo ejecutar expectedAt"),
      expect.any(String),
    );
    expect((scheduler as unknown as { timers: Map<string, NodeJS.Timeout> }).timers.has("po-1")).toBe(false);
    expect((scheduler as unknown as { scheduleMeta: Map<string, unknown> }).scheduleMeta.has("po-1")).toBe(false);
  });
});
