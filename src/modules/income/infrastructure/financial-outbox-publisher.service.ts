import { Injectable, Logger, NotFoundException, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { InjectEntityManager } from "@nestjs/typeorm";
import { EntityManager } from "typeorm";
import { SaleOrdersRealtimeService } from "src/modules/sale-orders/infrastructure/realtime/sale-orders-realtime.service";

type FinancialOutboxRow = { id: string; event_type: string; aggregate_type: string; aggregate_id: string; payload: Record<string, unknown> };
const MAX_ATTEMPTS = 10;

export type FinancialOutboxHealth = {
  pending: number;
  delayed: number;
  deadLettered: number;
  oldestPendingAt: string | null;
};

export type FinancialOutboxDeadLetter = {
  id: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  attempts: number;
  lastError: string | null;
  occurredAt: string;
  deadLetteredAt: string;
  manualRetryCount: number;
  retryRequestedAt: string | null;
  retryRequestedByUserId: string | null;
};

@Injectable()
export class FinancialOutboxPublisher implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(FinancialOutboxPublisher.name);
  private timer: ReturnType<typeof setInterval> | null = null;
  private healthTimer: ReturnType<typeof setInterval> | null = null;
  private running = false;
  private lastHealthAlertSignature: string | null = null;

  constructor(
    @InjectEntityManager() private readonly entityManager: EntityManager,
    private readonly realtime: SaleOrdersRealtimeService,
  ) {}

  onModuleInit() {
    if (process.env.INCOME_OUTBOX_ENABLED === "false") return;
    this.timer = setInterval(() => void this.runSafely(), 3000);
    this.timer.unref?.();
    this.healthTimer = setInterval(() => void this.checkHealthSafely(), 60_000);
    this.healthTimer.unref?.();
    void this.runSafely();
    void this.checkHealthSafely();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
    if (this.healthTimer) clearInterval(this.healthTimer);
    this.timer = null;
    this.healthTimer = null;
  }

  async runOnce() {
    if (this.running) return 0;
    this.running = true;
    try {
      return await this.entityManager.transaction(async (manager) => {
        const rows = await manager.query<FinancialOutboxRow[]>(
          `SELECT id, event_type, aggregate_type, aggregate_id, payload FROM financial_outbox_events
           WHERE published_at IS NULL AND dead_lettered_at IS NULL AND next_attempt_at <= now()
           ORDER BY occurred_at, id LIMIT 100 FOR UPDATE SKIP LOCKED`,
        );
        let published = 0;
        for (const row of rows) {
          try {
            const payload = row.payload ?? {};
            if (row.aggregate_type === "sale_order") {
              this.realtime.emitToAllConnected("sale-orders.updated", { updated: 1, saleOrderIds: [row.aggregate_id], eventId: row.id });
            } else {
              this.realtime.emitToAllConnected("income.updated", { eventId: row.id });
              const saleOrderId = String(payload.saleOrderId ?? "").trim();
              if (saleOrderId) this.realtime.emitToAllConnected("sale-orders.updated", { updated: 1, saleOrderIds: [saleOrderId], incomeEventId: row.id });
            }
            await manager.query(`UPDATE financial_outbox_events SET published_at = now(), attempts = attempts + 1, last_error = NULL WHERE id = $1`, [row.id]);
            published += 1;
          } catch (error) {
            const message = error instanceof Error ? error.message.slice(0, 2000) : "Error desconocido";
            await manager.query(
              `UPDATE financial_outbox_events
               SET attempts = attempts + 1,
                   last_error = $2,
                   next_attempt_at = now() + make_interval(secs => LEAST(3600, 5 * power(2, LEAST(attempts, 10)))::int),
                   dead_lettered_at = CASE WHEN attempts + 1 >= $3 * (manual_retry_count + 1) THEN now() ELSE NULL END
               WHERE id = $1`,
              [row.id, message, MAX_ATTEMPTS],
            );
            this.logger.error(`No se pudo publicar el evento financiero ${row.id}: ${message}`);
          }
        }
        return published;
      });
    } finally {
      this.running = false;
    }
  }

  async getHealth(): Promise<FinancialOutboxHealth> {
    const [row] = await this.entityManager.query<Array<{
      pending: number | string;
      delayed: number | string;
      deadLettered: number | string;
      oldestPendingAt: Date | string | null;
    }>>(
      `SELECT
         (SELECT COUNT(*)::int FROM financial_outbox_events
          WHERE published_at IS NULL AND dead_lettered_at IS NULL AND next_attempt_at <= now()) AS pending,
         (SELECT COUNT(*)::int FROM financial_outbox_events
          WHERE published_at IS NULL AND dead_lettered_at IS NULL AND next_attempt_at > now()) AS delayed,
         (SELECT COUNT(*)::int FROM financial_outbox_events
          WHERE published_at IS NULL AND dead_lettered_at IS NOT NULL) AS "deadLettered",
         (SELECT MIN(occurred_at) FROM financial_outbox_events
          WHERE published_at IS NULL AND dead_lettered_at IS NULL) AS "oldestPendingAt"`,
    );
    return {
      pending: Number(row?.pending ?? 0),
      delayed: Number(row?.delayed ?? 0),
      deadLettered: Number(row?.deadLettered ?? 0),
      oldestPendingAt: row?.oldestPendingAt ? new Date(row.oldestPendingAt).toISOString() : null,
    };
  }

  async listDeadLetters(limit = 50): Promise<FinancialOutboxDeadLetter[]> {
    const safeLimit = Number.isInteger(limit) ? Math.max(1, Math.min(limit, 100)) : 50;
    const rows = await this.entityManager.query<Array<{
      id: string; event_type: string; aggregate_type: string; aggregate_id: string; attempts: number;
      last_error: string | null; occurred_at: Date | string; dead_lettered_at: Date | string;
      manual_retry_count: number; retry_requested_at: Date | string | null; retry_requested_by_user_id: string | null;
    }>>(
      `SELECT id, event_type, aggregate_type, aggregate_id, attempts, last_error, occurred_at, dead_lettered_at,
              manual_retry_count, retry_requested_at, retry_requested_by_user_id
       FROM financial_outbox_events
       WHERE published_at IS NULL AND dead_lettered_at IS NOT NULL
       ORDER BY dead_lettered_at DESC, id LIMIT $1`,
      [safeLimit],
    );
    return rows.map((row) => ({
      id: row.id,
      eventType: row.event_type,
      aggregateType: row.aggregate_type,
      aggregateId: row.aggregate_id,
      attempts: Number(row.attempts),
      lastError: row.last_error,
      occurredAt: new Date(row.occurred_at).toISOString(),
      deadLetteredAt: new Date(row.dead_lettered_at).toISOString(),
      manualRetryCount: Number(row.manual_retry_count),
      retryRequestedAt: row.retry_requested_at ? new Date(row.retry_requested_at).toISOString() : null,
      retryRequestedByUserId: row.retry_requested_by_user_id,
    }));
  }

  async retryDeadLetter(id: string, userId: string): Promise<{ id: string; queued: true }> {
    const rows = await this.entityManager.query<Array<{ id: string }>>(
      `UPDATE financial_outbox_events
       SET dead_lettered_at = NULL, next_attempt_at = now(), manual_retry_count = manual_retry_count + 1,
           retry_requested_at = now(), retry_requested_by_user_id = $2
       WHERE id = $1 AND published_at IS NULL AND dead_lettered_at IS NOT NULL
       RETURNING id`,
      [id, userId],
    );
    if (!rows[0]) throw new NotFoundException("No existe un evento financiero fallido pendiente de recuperar.");
    this.logger.warn(`Reintento manual solicitado para evento financiero ${id} por usuario ${userId}`);
    return { id, queued: true };
  }

  private async runSafely() {
    try { await this.runOnce(); }
    catch (error) { this.logger.error("Falló el ciclo de publicación de eventos financieros", error instanceof Error ? error.stack : undefined); }
  }

  private async checkHealthSafely() {
    try {
      const health = await this.getHealth();
      const configuredAge = Number(process.env.INCOME_OUTBOX_ALERT_AGE_SECONDS ?? 300);
      const staleAgeSeconds = Number.isInteger(configuredAge) && configuredAge >= 0 ? configuredAge : 300;
      const oldestPendingAgeSeconds = health.oldestPendingAt
        ? Math.max(0, Math.floor((Date.now() - Date.parse(health.oldestPendingAt)) / 1000))
        : null;
      const alerts = [
        ...(health.deadLettered > 0 ? ["dead-lettered"] : []),
        ...(staleAgeSeconds > 0 && oldestPendingAgeSeconds !== null && oldestPendingAgeSeconds >= staleAgeSeconds
          ? ["stale-pending"]
          : []),
      ];
      if (!alerts.length) {
        this.lastHealthAlertSignature = null;
        return;
      }
      const signature = alerts.join("|");
      if (signature === this.lastHealthAlertSignature) return;
      this.lastHealthAlertSignature = signature;
      this.logger.error(`financial_outbox_operational_alert ${JSON.stringify({
        alerts,
        pending: health.pending,
        delayed: health.delayed,
        deadLettered: health.deadLettered,
        oldestPendingAt: health.oldestPendingAt,
        oldestPendingAgeSeconds,
      })}`);
    } catch (error) {
      this.logger.error("No se pudo verificar la salud del outbox financiero", error instanceof Error ? error.stack : undefined);
    }
  }
}
