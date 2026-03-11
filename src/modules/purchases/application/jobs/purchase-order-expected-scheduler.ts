import { Injectable, InternalServerErrorException } from "@nestjs/common";
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
    
    this.scheduleMeta.set(poId, { expectedAtMs, scheduledAtMs: scheduledAt });
    if (delay <= 0) {
      this.runExpected.execute(poId).catch((err) => {
        throw new InternalServerErrorException({
          type:'error',
          message:err
        });
      });
      return;
    }

    const timer = setTimeout(() => {      
      this.runExpected.execute(poId).catch((err) => {
        throw new InternalServerErrorException({
          type:'error',
          message:err
        });
      });
      this.timers.delete(poId);
      this.scheduleMeta.delete(poId);
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
