import { SaleOrdersJobsScheduler } from "./sale-orders-jobs.scheduler";

describe("SaleOrdersJobsScheduler", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("emits sale-orders.updated after automatic workflow updates", async () => {
    const realtimeService = { emitToAllConnected: jest.fn() };
    const automaticWorkflowJob = {
      run: jest.fn().mockResolvedValue({
        found: 2,
        updated: 1,
        failed: 0,
        saleOrderIds: ["order-2"],
      }),
    };
    const scheduler = new SaleOrdersJobsScheduler(
      { run: jest.fn().mockResolvedValue({ updated: 0, saleOrderIds: [] }) } as any,
      realtimeService as any,
      automaticWorkflowJob as any,
    );

    scheduler.onModuleInit();
    await Promise.resolve();
    await Promise.resolve();

    expect(realtimeService.emitToAllConnected).toHaveBeenCalledWith("sale-orders.updated", {
      updated: 1,
      saleOrderIds: ["order-2"],
      source: "automatic-workflow",
    });
    scheduler.onModuleDestroy();
  });

  it("does not emit automatic event when no order changed", async () => {
    const realtimeService = { emitToAllConnected: jest.fn() };
    const scheduler = new SaleOrdersJobsScheduler(
      { run: jest.fn().mockResolvedValue({ updated: 0, saleOrderIds: [] }) } as any,
      realtimeService as any,
      {
        run: jest.fn().mockResolvedValue({
          found: 1,
          updated: 0,
          failed: 0,
          saleOrderIds: [],
        }),
      } as any,
    );

    scheduler.onModuleInit();
    await Promise.resolve();
    await Promise.resolve();

    expect(realtimeService.emitToAllConnected).not.toHaveBeenCalled();
    scheduler.onModuleDestroy();
  });
});
