import { RecurringPurchaseDailyJob } from "../../application/jobs/recurring-purchase-daily.job";
import { RecurringPurchasesJobsScheduler } from "./recurring-purchases-jobs.scheduler";

describe("RecurringPurchasesJobsScheduler", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("runs the daily recurring purchase job on start and schedules it every 24 hours", async () => {
    jest.useFakeTimers();
    const setIntervalSpy = jest.spyOn(global, "setInterval");
    const clearIntervalSpy = jest.spyOn(global, "clearInterval");
    const job = { run: jest.fn(async () => ({ generated: 0, reminders: 0 })) };
    const scheduler = new RecurringPurchasesJobsScheduler(job as unknown as RecurringPurchaseDailyJob);

    scheduler.onModuleInit();
    await Promise.resolve();

    expect(job.run).toHaveBeenCalledTimes(1);
    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 24 * 60 * 60_000);

    jest.advanceTimersByTime(24 * 60 * 60_000);
    await Promise.resolve();

    expect(job.run).toHaveBeenCalledTimes(2);

    scheduler.onModuleDestroy();

    expect(clearIntervalSpy).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });
});
