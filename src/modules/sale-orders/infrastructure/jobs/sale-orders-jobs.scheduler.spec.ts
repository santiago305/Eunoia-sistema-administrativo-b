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
    const automaticPayload = {
      updated: 1,
      saleOrderIds: ["order-2"],
      source: "automatic-workflow",
      saleOrders: [{ id: "order-2", currentState: { code: "PROCESSED" } }],
      statistics: { totals: { orders: 1 } },
    };
    const payloadBuilder = { build: jest.fn().mockResolvedValue(automaticPayload) };
    const automaticWorkflowJob = {
      run: jest.fn().mockResolvedValue({
        found: 2,
        updated: 1,
        failed: 0,
        saleOrderIds: ["order-2"],
      }),
    };
    const scheduler = new (SaleOrdersJobsScheduler as any)(
      realtimeService as any,
      automaticWorkflowJob as any,
      payloadBuilder as any,
    );

    scheduler.onModuleInit();
    expect(automaticWorkflowJob.run).not.toHaveBeenCalled();

    jest.advanceTimersByTime(60_000);
    await Promise.resolve();
    await Promise.resolve();

    expect(payloadBuilder.build).toHaveBeenCalledWith({
      updated: 1,
      saleOrderIds: ["order-2"],
      source: "automatic-workflow",
    });
    expect(realtimeService.emitToAllConnected).toHaveBeenCalledWith("sale-orders.updated", automaticPayload);
    scheduler.onModuleDestroy();
  });

  it("does not emit automatic event when no order changed", async () => {
    const realtimeService = { emitToAllConnected: jest.fn() };
    const payloadBuilder = { build: jest.fn() };
    const scheduler = new (SaleOrdersJobsScheduler as any)(
      realtimeService as any,
      {
        run: jest.fn().mockResolvedValue({
          found: 1,
          updated: 0,
          failed: 0,
          saleOrderIds: [],
        }),
      } as any,
      payloadBuilder as any,
    );

    scheduler.onModuleInit();
    jest.advanceTimersByTime(60_000);
    await Promise.resolve();
    await Promise.resolve();

    expect(realtimeService.emitToAllConnected).not.toHaveBeenCalled();
    expect(payloadBuilder.build).not.toHaveBeenCalled();
    scheduler.onModuleDestroy();
  });

  it("uses configured automatic workflow interval", async () => {
    const originalInterval = envs.saleOrderJobs.automaticWorkflowIntervalMs;
    envs.saleOrderJobs.automaticWorkflowIntervalMs = 12_000;
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
    const scheduler = new (SaleOrdersJobsScheduler as any)(
      { emitToAllConnected: jest.fn() } as any,
      automaticWorkflowJob as any,
      { build: jest.fn() } as any,
    );

    scheduler.onModuleInit();
    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 12_000);

    scheduler.onModuleDestroy();
    setIntervalSpy.mockRestore();
    envs.saleOrderJobs.automaticWorkflowIntervalMs = originalInterval;
  });

  it("uses automatic workflow fallback when no env interval overrides it", async () => {
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
    const scheduler = new (SaleOrdersJobsScheduler as any)(
      { emitToAllConnected: jest.fn() } as any,
      automaticWorkflowJob as any,
      { build: jest.fn() } as any,
    );

    scheduler.onModuleInit();
    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 60_000);

    scheduler.onModuleDestroy();
    setIntervalSpy.mockRestore();
    envs.saleOrderJobs.automaticWorkflowIntervalMs = originalInterval;
  });
});
