import { SaleOrdersJobsScheduler } from "./sale-orders-jobs.scheduler";
import { envs } from "src/infrastructure/config/envs";

describe("SaleOrdersJobsScheduler", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    envs.saleOrderJobs.automaticWorkflowIntervalMs = 60_000;
    envs.saleOrderJobs.automaticWorkflowRunOnStart = false;
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
    expect(automaticWorkflowJob.run).not.toHaveBeenCalled();

    jest.advanceTimersByTime(60_000);
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
    jest.advanceTimersByTime(60_000);
    await Promise.resolve();
    await Promise.resolve();

    expect(realtimeService.emitToAllConnected).not.toHaveBeenCalled();
    scheduler.onModuleDestroy();
  });

  it("uses daily automatic workflow fallback when no env interval overrides it", async () => {
    const originalInterval = envs.saleOrderJobs.automaticWorkflowIntervalMs;
    envs.saleOrderJobs.automaticWorkflowIntervalMs = undefined as unknown as number;
    envs.saleOrderJobs.automaticWorkflowRunOnStart = false;
    const setIntervalSpy = jest.spyOn(global, "setInterval");

    const automaticWorkflowJob = {
      run: jest.fn().mockResolvedValue({
        found: 0,
        updated: 0,
        failed: 0,
        saleOrderIds: [],
      }),
    };
    const scheduler = new SaleOrdersJobsScheduler(
      { run: jest.fn().mockResolvedValue({ updated: 0, saleOrderIds: [] }) } as any,
      { emitToAllConnected: jest.fn() } as any,
      automaticWorkflowJob as any,
    );

    scheduler.onModuleInit();
    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 24 * 60 * 60_000);

    scheduler.onModuleDestroy();
    setIntervalSpy.mockRestore();
    envs.saleOrderJobs.automaticWorkflowIntervalMs = originalInterval;
  });
});
