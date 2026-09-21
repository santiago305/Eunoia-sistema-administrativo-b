import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ReleaseDueScheduledPaymentsJob } from "../../application/jobs/release-due-scheduled-payments.job";

const SCHEDULED_PAYMENTS_INTERVAL_MS = 60_000;

@Injectable()
export class PaymentsJobsScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PaymentsJobsScheduler.name);
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(private readonly releaseDuePayments: ReleaseDueScheduledPaymentsJob) {}

  onModuleInit() {
    void this.runSafely();
    this.timer = setInterval(() => void this.runSafely(), SCHEDULED_PAYMENTS_INTERVAL_MS);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
  }

  private async runSafely() {
    if (this.running) return;
    this.running = true;
    try {
      const result = await this.releaseDuePayments.run();
      if (result.released > 0) {
        this.logger.log(`${result.released} pago(s) programado(s) enviados a aprobacion`);
      }
    } catch (error) {
      this.logger.warn(`No se pudieron liberar pagos programados: ${(error as Error)?.message ?? "unknown"}`);
    } finally {
      this.running = false;
    }
  }
}
