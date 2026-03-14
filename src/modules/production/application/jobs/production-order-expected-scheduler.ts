import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { RunProductionTimeUsecase } from "../usecases/production-order/run-production-time.usecase";

@Injectable()
export class ProductionOrderExpectedScheduler {
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
      this.runExpected.execute(productionId).catch((err) => {
        throw new InternalServerErrorException({
          type: "error",
          message: err,
        });
      });
      return;
    }

    const timer = setTimeout(() => {
      this.runExpected.execute(productionId).catch((err) => {
        throw new InternalServerErrorException({
          type: "error",
          message: err,
        });
      });
      this.timers.delete(productionId);
      this.scheduleMeta.delete(productionId);
    }, delay);

    this.timers.set(productionId, timer);
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
