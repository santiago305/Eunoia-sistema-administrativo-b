import { Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";
import { PurchaseHistoryService } from "src/modules/purchases/application/services/purchase-history.service";

type ReleasedPayment = {
  id: string;
  poId: string | null;
  scheduledByUserId: string | null;
  scheduledAt: Date;
};

@Injectable()
export class ReleaseDueScheduledPaymentsJob {
  constructor(
    private readonly dataSource: DataSource,
    private readonly history: PurchaseHistoryService,
  ) {}

  async run(batchSize = 100): Promise<{ released: number }> {
    const safeBatchSize = Math.max(1, Math.min(500, Math.trunc(batchSize)));
    return this.dataSource.transaction(async (manager) => {
      const rows = await manager.query(
        `
          WITH due AS (
            SELECT pay_doc_id
            FROM payment_documents
            WHERE status = 'SCHEDULED'
              AND scheduled_at IS NOT NULL
              AND scheduled_at <= NOW()
            ORDER BY scheduled_at ASC
            FOR UPDATE SKIP LOCKED
            LIMIT $1
          )
          UPDATE payment_documents pd
          SET status = 'PENDING_APPROVAL'
          FROM due
          WHERE pd.pay_doc_id = due.pay_doc_id
            AND pd.status = 'SCHEDULED'
          RETURNING
            pd.pay_doc_id AS id,
            pd.po_id AS "poId",
            pd.scheduled_by_user_id AS "scheduledByUserId",
            pd.scheduled_at AS "scheduledAt"
        `,
        [safeBatchSize],
      ) as ReleasedPayment[];

      for (const payment of rows) {
        if (!payment.poId) continue;
        await this.history.recordPayment({
          purchaseId: payment.poId,
          eventType: "PAYMENT_REQUESTED",
          description: "El pago programado llego a su fecha y quedo pendiente de aprobacion.",
          performedByUserId: payment.scheduledByUserId,
          metadata: {
            paymentId: payment.id,
            scheduledAt: payment.scheduledAt,
            releasedAutomatically: true,
          },
          tx: { manager } as any,
        });
      }

      return { released: rows.length };
    });
  }
}
