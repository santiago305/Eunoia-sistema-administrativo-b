import { Injectable, Logger } from "@nestjs/common";
import { RunProductionTimeUsecase } from "../usecases/production-order/run-production-time.usecase";

@Injectable()
export class ProductionOrderExpectedScheduler {
  private readonly logger = new Logger(ProductionOrderExpectedScheduler.name);
  private readonly timers = new Map<string, NodeJS.Timeout>();
  private readonly scheduleMeta = new Map<string, { expectedAtMs: number; scheduledAtMs: number }>();
  private readonly monitorIntervalMs = 30000;
  private monitorTimer?: NodeJS.Timeout;

  constructor(
    private readonly runExpected: RunProductionTimeUsecase
  ) {}

  schedule(productionId: string, expectedAt: Date) {
    this.cancel(productionId);

    const scheduledAt = Date.now();
    const expectedAtMs = expectedAt.getTime();
    const delay = expectedAtMs - scheduledAt;

    this.scheduleMeta.set(productionId, { expectedAtMs, scheduledAtMs: scheduledAt });
    if (delay <= 0) {
      void this.runExpected.execute(productionId).catch((err) => {
        this.logExecutionError(productionId, err);
      });
      return;
    }

    const timer = setTimeout(() => {
      void this.runExpected.execute(productionId).catch((err) => {
        this.logExecutionError(productionId, err);
      });
      this.timers.delete(productionId);
      this.scheduleMeta.delete(productionId);
    }, delay);

    this.timers.set(productionId, timer);
  }

  private logExecutionError(productionId: string, error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    this.logger.error(`No se pudo ejecutar la producción esperada ${productionId}: ${message}`, stack);
  }

  cancel(productionId: string) {
    const timer = this.timers.get(productionId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(productionId);
      this.scheduleMeta.delete(productionId);
    }
  }

  private ensureMonitor() {
    if (this.monitorTimer) return;
    this.monitorTimer = setInterval(() => {
      if (this.scheduleMeta.size === 0) return;
      const now = Date.now();
      const items = Array.from(this.scheduleMeta.entries()).map(([id, meta]) => ({
        productionId: id,
        expectedAt: new Date(meta.expectedAtMs).toISOString(),
        remainingMs: meta.expectedAtMs - now,
        scheduledAt: new Date(meta.scheduledAtMs).toISOString(),
      }));
      console.log(
        "[ProductionOrderExpectedScheduler] monitor",
        JSON.stringify({ total: items.length, now: new Date(now).toISOString(), items }),
      );
    }, this.monitorIntervalMs);
  }
}
