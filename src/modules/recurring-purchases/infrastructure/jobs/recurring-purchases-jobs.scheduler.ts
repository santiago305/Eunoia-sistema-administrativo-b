import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { RecurringPurchaseDailyJob } from "../../application/jobs/recurring-purchase-daily.job";

const RECURRING_PURCHASE_DAILY_INTERVAL_MS = 24 * 60 * 60_000;

@Injectable()
export class RecurringPurchasesJobsScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RecurringPurchasesJobsScheduler.name);
  private readonly timers: NodeJS.Timeout[] = [];
  private readonly runningJobs = new Set<string>();

  constructor(private readonly dailyJob: RecurringPurchaseDailyJob) {}

  onModuleInit() {
    this.schedule("recurring-purchases-daily", RECURRING_PURCHASE_DAILY_INTERVAL_MS, () => this.dailyJob.run());
  }

  onModuleDestroy() {
    this.timers.forEach((timer) => clearInterval(timer));
    this.timers.length = 0;
  }

  private schedule(name: string, everyMs: number, runner: () => Promise<unknown>) {
    const runSafely = async () => {
      if (this.runningJobs.has(name)) {
        this.logger.debug(`${name} skipped: previous run still in progress`);
        return;
      }
      this.runningJobs.add(name);
      const startedAt = Date.now();
      try {
        const result = await runner();
        this.logger.debug(`${name} completed in ${Date.now() - startedAt}ms result=${JSON.stringify(result)}`);
      } finally {
        this.runningJobs.delete(name);
      }
    };

    void runSafely().catch((error) => {
      this.logger.warn(`${name} initial run failed: ${(error as Error)?.message ?? "unknown"}`);
    });
    const timer = setInterval(() => {
      void runSafely().catch((error) => {
        this.logger.warn(`${name} run failed: ${(error as Error)?.message ?? "unknown"}`);
      });
    }, everyMs);
    this.timers.push(timer);
  }
}
