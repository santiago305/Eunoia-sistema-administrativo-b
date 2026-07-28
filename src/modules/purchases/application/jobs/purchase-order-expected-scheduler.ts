import { Injectable, Logger } from "@nestjs/common";
import { RunExpectedAtUsecase } from "../usecases/purchase-order/run-expected-at.usecase";

@Injectable()
export class PurchaseOrderExpectedScheduler {
  private readonly logger = new Logger(PurchaseOrderExpectedScheduler.name);
  private readonly timers = new Map<string, NodeJS.Timeout>();
  private readonly scheduleMeta = new Map<string, { expectedAtMs: number; scheduledAtMs: number }>();
  private readonly monitorIntervalMs = 30000;
  private monitorTimer?: NodeJS.Timeout;

  constructor(private readonly runExpected: RunExpectedAtUsecase) {}

  private async runScheduled(poId: string) {
    try {
      await this.runExpected.execute(poId);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const trace = err instanceof Error ? err.stack : undefined;
      this.logger.warn(
        `No se pudo ejecutar expectedAt para compra ${poId}: ${message}`,
        trace,
      );
    } finally {
      this.timers.delete(poId);
      this.scheduleMeta.delete(poId);
    }
  }

  schedule(poId: string, expectedAt: Date) {
    this.cancel(poId);

    const scheduledAt = Date.now();
    const expectedAtMs = expectedAt.getTime();
    const delay = expectedAtMs - scheduledAt;

    this.scheduleMeta.set(poId, { expectedAtMs, scheduledAtMs: scheduledAt });
    if (delay <= 0) {
      void this.runScheduled(poId);
      return;
    }

    const timer = setTimeout(() => {
      void this.runScheduled(poId);
    }, delay);

    this.timers.set(poId, timer);
  }

  cancel(poId: string) {
    const timer = this.timers.get(poId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(poId);
      this.scheduleMeta.delete(poId);
    }
  }

  private ensureMonitor() {
    if (this.monitorTimer) return;
    this.monitorTimer = setInterval(() => {
      if (this.scheduleMeta.size === 0) return;
      const now = Date.now();
      const items = Array.from(this.scheduleMeta.entries()).map(([poId, meta]) => ({
        poId,
        expectedAt: new Date(meta.expectedAtMs).toISOString(),
        remainingMs: meta.expectedAtMs - now,
        scheduledAt: new Date(meta.scheduledAtMs).toISOString(),
      }));
      console.log(
        "[PurchaseOrderExpectedScheduler] monitor",
        JSON.stringify({ total: items.length, now: new Date(now).toISOString(), items }),
      );
    }, this.monitorIntervalMs);
  }
}
