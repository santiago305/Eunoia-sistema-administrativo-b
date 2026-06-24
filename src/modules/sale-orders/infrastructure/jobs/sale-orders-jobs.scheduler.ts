import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { SaleOrdersRealtimeService } from "src/modules/sale-orders/infrastructure/realtime/sale-orders-realtime.service";
import { RunAutomaticWorkflowTransitionsJob } from "src/modules/workflow/application/jobs/run-automatic-workflow-transitions.job";
import { envs } from "src/infrastructure/config/envs";

const DAILY_AUTOMATIC_WORKFLOW_FALLBACK_MS = 60_000;

@Injectable()
export class SaleOrdersJobsScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SaleOrdersJobsScheduler.name);
  private readonly timers: NodeJS.Timeout[] = [];
  private readonly runningJobs = new Set<string>();

  constructor(
    private readonly realtimeService: SaleOrdersRealtimeService,
    private readonly automaticWorkflowJob: RunAutomaticWorkflowTransitionsJob,
  ) {}

  onModuleInit() {
    this.schedule("automatic-workflow", DAILY_AUTOMATIC_WORKFLOW_FALLBACK_MS, async () => {
      const result = await this.automaticWorkflowJob.run({ limit: 500 });
      if (result.updated) {
        this.realtimeService.emitToAllConnected("sale-orders.updated", {
          updated: result.updated,
          saleOrderIds: result.saleOrderIds,
          source: "automatic-workflow",
        });
      }
      return result;
    }, {
      everyMs: DAILY_AUTOMATIC_WORKFLOW_FALLBACK_MS,
      runOnStart: envs.saleOrderJobs.automaticWorkflowRunOnStart,
      logEmptyResult: false,
    });
  }

  onModuleDestroy() {
    this.timers.forEach((timer) => clearInterval(timer));
    this.timers.length = 0;
  }

  private schedule(
    name: string,
    everyMs: number,
    runner: () => Promise<unknown>,
    options?: { everyMs?: number; runOnStart?: boolean; logEmptyResult?: boolean },
  ) {
    const intervalMs = options?.everyMs ?? everyMs;
    const runOnStart = options?.runOnStart ?? true;
    const logEmptyResult = options?.logEmptyResult ?? true;
    const runSafely = async () => {
      if (this.runningJobs.has(name)) {
        this.logger.debug(`${name} skipped: previous run still in progress`);
        return;
      }
      this.runningJobs.add(name);
      const startedAt = Date.now();
      try {
        const result = await runner();
        if (logEmptyResult || this.hasWorkResult(result)) {
          this.logger.debug(`${name} completed in ${Date.now() - startedAt}ms result=${JSON.stringify(result)}`);
        }
      } finally {
        this.runningJobs.delete(name);
      }
    };

    if (runOnStart) {
      void runSafely().catch((error) => {
        this.logger.warn(`${name} initial run failed: ${(error as Error)?.message ?? "unknown"}`);
      });
    }
    const timer = setInterval(() => {
      void runSafely().catch((error) => {
        this.logger.warn(`${name} run failed: ${(error as Error)?.message ?? "unknown"}`);
      });
    }, intervalMs);
    this.timers.push(timer);
  }

  private hasWorkResult(result: unknown) {
    if (!result || typeof result !== "object") return true;
    const record = result as Record<string, unknown>;
    return Number(record.found ?? 0) > 0 || Number(record.updated ?? 0) > 0 || Number(record.failed ?? 0) > 0;
  }
}
