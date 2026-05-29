import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { UpdateSaleOrdersDeliveryDateTodayJob } from "src/modules/sale-orders/application/jobs/update-sale-orders-deliverydate-today.job";
import { NotificationRealtimeService } from "src/modules/mail/infrastructure/realtime/notification-realtime.service";

@Injectable()
export class SaleOrdersJobsScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SaleOrdersJobsScheduler.name);
  private readonly timers: NodeJS.Timeout[] = [];
  private readonly runningJobs = new Set<string>();

  constructor(
    private readonly updateTodayJob: UpdateSaleOrdersDeliveryDateTodayJob,
    private readonly realtimeService: NotificationRealtimeService,
  ) {}

  onModuleInit() {
    this.schedule(
      "deliverydate-today",
      60_000,
      async () => {
        const result = await this.updateTodayJob.run({ limit: 500, timeZone: "America/Lima" });
        if (result?.updated) {
          this.realtimeService.emitToAllConnected("sale-orders.updated", {
            date: result.date,
            updated: result.updated,
            saleOrderIds: result.saleOrderIds ?? [],
          });
        }
        return result;
      },
    );
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
