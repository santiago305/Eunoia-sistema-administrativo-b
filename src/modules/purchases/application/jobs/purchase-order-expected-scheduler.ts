import { Injectable } from "@nestjs/common";
import { RunExpectedAtUsecase } from "../usecases/purchase-order/run-expected-at.usecase";

@Injectable()
export class PurchaseOrderExpectedScheduler {
  private readonly timers = new Map<string, NodeJS.Timeout>();
  private readonly scheduleMeta = new Map<string, { expectedAtMs: number; scheduledAtMs: number }>();
  private readonly monitorIntervalMs = 30000;
  private monitorTimer?: NodeJS.Timeout;

  constructor(private readonly runExpected: RunExpectedAtUsecase) {}

  schedule(poId: string, expectedAt: Date) {
    this.cancel(poId);

    const scheduledAt = Date.now();
    const expectedAtMs = expectedAt.getTime();
    const delay = expectedAtMs - scheduledAt;
    console.log(
      "[PurchaseOrderExpectedScheduler] schedule",
      JSON.stringify({
        poId,
        expectedAt: new Date(expectedAtMs).toISOString(),
        scheduledAt: new Date(scheduledAt).toISOString(),
        delayMs: delay,
      }),
    );
    this.scheduleMeta.set(poId, { expectedAtMs, scheduledAtMs: scheduledAt });
    this.ensureMonitor();
    if (delay <= 0) {
      console.log(
        "[PurchaseOrderExpectedScheduler] execute-now",
        JSON.stringify({
          poId,
          expectedAt: new Date(expectedAtMs).toISOString(),
          now: new Date().toISOString(),
          delayMs: delay,
        }),
      );
      this.runExpected.execute(poId).catch(() => undefined);
      return;
    }

    const timer = setTimeout(() => {
      const firedAt = Date.now();
      console.log(
        "[PurchaseOrderExpectedScheduler] timeout-fired",
        JSON.stringify({
          poId,
          expectedAt: new Date(expectedAtMs).toISOString(),
          firedAt: new Date(firedAt).toISOString(),
          driftMs: firedAt - expectedAtMs,
        }),
      );
      this.runExpected.execute(poId).catch(() => undefined);
      this.timers.delete(poId);
      this.scheduleMeta.delete(poId);
    }, delay);

    this.timers.set(poId, timer);
  }

  cancel(poId: string) {
    const timer = this.timers.get(poId);
    if (timer) {
      console.log("[PurchaseOrderExpectedScheduler] cancel", JSON.stringify({ poId }));
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
