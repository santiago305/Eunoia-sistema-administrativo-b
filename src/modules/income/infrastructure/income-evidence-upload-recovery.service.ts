import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { InjectDataSource, InjectEntityManager } from "@nestjs/typeorm";
import { createHash } from "node:crypto";
import { DataSource, EntityManager } from "typeorm";
import { FILE_STORAGE, FileStorage } from "src/shared/application/ports/file-storage.port";
import { SaleOrderAttachmentType } from "src/modules/sale-order-attachments/domain/value-objects/sale-order-attachment-type";
import { SaleOrdersRealtimeService } from "src/modules/sale-orders/infrastructure/realtime/sale-orders-realtime.service";

type RecoverableEvidenceOperation = {
  id: string;
  sale_order_payment_id: string;
  sale_order_id: string;
  uploaded_by_user_id: string;
  idempotency_key: string;
  source_content_sha256: string;
  prepared_content_sha256: string | null;
  original_name: string;
  mime_type: string;
  size_bytes: number | string;
  status: "STAGED" | "PROMOTED" | "FAILED";
  staging_key: string | null;
  promoted_key: string | null;
};

type RecoveredEvidenceFile = { key: string; filename: string; sizeBytes: number };

const RECOVERY_INTERVAL_MS = 60_000;
const RECOVERY_BATCH_SIZE = 20;
const RECOVERY_LOCK_KEY = "eunoia:income-evidence-upload-recovery";

@Injectable()
export class IncomeEvidenceUploadRecoveryService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(IncomeEvidenceUploadRecoveryService.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    @InjectEntityManager() private readonly entityManager: EntityManager,
    @InjectDataSource() private readonly dataSource: DataSource,
    @Inject(FILE_STORAGE) private readonly fileStorage: FileStorage,
    private readonly realtime: SaleOrdersRealtimeService,
  ) {}

  onModuleInit() {
    if (process.env.INCOME_EVIDENCE_RECOVERY_ENABLED === "false") return;
    this.timer = setInterval(() => void this.runSafely(), RECOVERY_INTERVAL_MS);
    this.timer.unref?.();
    void this.runSafely();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  async runOnce() {
    if (this.running) return { claimed: 0, recovered: 0, failed: 0, skipped: true };
    this.running = true;
    const queryRunner = this.dataSource.createQueryRunner();
    let lockAcquired = false;
    try {
      await queryRunner.connect();
      const [{ locked }] = await queryRunner.query(
        "SELECT pg_try_advisory_lock(hashtext($1)) AS locked",
        [RECOVERY_LOCK_KEY],
      );
      lockAcquired = Boolean(locked);
      if (!lockAcquired) return { claimed: 0, recovered: 0, failed: 0, skipped: true };
      return await this.recoverBatch(RECOVERY_BATCH_SIZE);
    } finally {
      if (lockAcquired) {
        await queryRunner.query("SELECT pg_advisory_unlock(hashtext($1))", [RECOVERY_LOCK_KEY]).catch(() => undefined);
      }
      await queryRunner.release();
      this.running = false;
    }
  }

  async recoverBatch(limit = RECOVERY_BATCH_SIZE) {
    const safeLimit = Math.max(1, Math.min(Math.trunc(limit) || 1, 100));
    const operations = await this.claimRecoverableOperations(safeLimit);
    let recovered = 0;
    let failed = 0;
    for (const operation of operations) {
      try {
        const file = await this.preparePromotedFile(operation);
        const wasRecovered = await this.persistRecoveredEvidence(operation, file);
        if (wasRecovered) {
          recovered += 1;
          try {
            this.realtime.emitToAllConnected("sale-orders.updated", {
              updated: 1,
              saleOrderIds: [operation.sale_order_id],
              incomeEvent: "payment_evidence_recovered",
            });
            this.realtime.emitToAllConnected("income.updated", {
              incomeId: operation.sale_order_payment_id,
              saleOrderId: operation.sale_order_id,
              reason: "payment_evidence_recovered",
            });
          } catch (error) {
            this.logger.warn(`income evidence recovery realtime failed=${this.errorCode(error)}`);
          }
        }
      } catch (error) {
        failed += 1;
        const code = this.errorCode(error);
        await this.releaseClaim(operation.id, code);
        this.logger.warn(`income evidence recovery id=${operation.id} failed=${code}`);
      }
    }
    const result = { claimed: operations.length, recovered, failed, skipped: false };
    if (operations.length || failed) this.logger.log(`income evidence recovery ${JSON.stringify(result)}`);
    return result;
  }

  private async claimRecoverableOperations(limit: number) {
    const result = await this.entityManager.query<RecoverableEvidenceOperation[]>(
      `WITH candidates AS (
         SELECT id
         FROM payment_evidence_upload_operations
         WHERE status IN ('STAGED', 'PROMOTED', 'FAILED')
           AND (staging_key IS NOT NULL OR promoted_key IS NOT NULL)
           AND attempts < 5
           AND updated_at <= now() - interval '5 minutes'
           AND (lease_until IS NULL OR lease_until <= now())
         ORDER BY updated_at ASC, id ASC
         LIMIT $1
         FOR UPDATE SKIP LOCKED
       )
       UPDATE payment_evidence_upload_operations operation
       SET status = CASE
             WHEN operation.status = 'FAILED' AND operation.promoted_key IS NOT NULL THEN 'PROMOTED'
             WHEN operation.status = 'FAILED' AND operation.staging_key IS NOT NULL THEN 'STAGED'
             ELSE operation.status
           END,
           lease_until = now() + interval '5 minutes', attempts = operation.attempts + 1,
           updated_at = now(), last_error = NULL
       FROM candidates
       WHERE operation.id = candidates.id
       RETURNING operation.id, operation.sale_order_payment_id, operation.sale_order_id,
         operation.uploaded_by_user_id, operation.idempotency_key, operation.source_content_sha256,
         operation.prepared_content_sha256, operation.original_name, operation.mime_type,
         operation.size_bytes, operation.status, operation.staging_key, operation.promoted_key`,
      [limit],
    );
    return Array.isArray(result?.[0])
      ? result[0] as RecoverableEvidenceOperation[]
      : result as RecoverableEvidenceOperation[];
  }

  private async preparePromotedFile(operation: RecoverableEvidenceOperation): Promise<RecoveredEvidenceFile> {
    if (!operation.prepared_content_sha256) throw new Error("RECOVERY_PREPARED_HASH_MISSING");
    const expectedSize = Number(operation.size_bytes);
    if (!Number.isSafeInteger(expectedSize) || expectedSize <= 0) throw new Error("RECOVERY_SIZE_INVALID");
    const privatePrefix = `private/sale-order-attachments/${operation.sale_order_id}/`;
    const stagedPrefix = `staging/sale-order-attachments/${operation.sale_order_id}/`;
    if (operation.promoted_key && !operation.promoted_key.startsWith(privatePrefix)) throw new Error("RECOVERY_PROMOTED_KEY_INVALID");
    if (operation.staging_key && !operation.staging_key.startsWith(stagedPrefix)) throw new Error("RECOVERY_STAGING_KEY_INVALID");

    const promotedKey = operation.promoted_key ?? (operation.staging_key
      ? `${privatePrefix}${this.fileStorage.resolve(operation.staging_key).filename}`
      : null);
    if (!promotedKey) throw new Error("RECOVERY_STORAGE_KEY_MISSING");

    if (await this.fileStorage.exists(promotedKey)) {
      const bytes = await this.fileStorage.read(promotedKey);
      this.assertPreparedFile(bytes, expectedSize, operation.prepared_content_sha256);
      return { key: promotedKey, filename: this.fileStorage.resolve(promotedKey).filename, sizeBytes: bytes.length };
    }

    if (!operation.staging_key || !await this.fileStorage.exists(operation.staging_key)) {
      throw new Error("RECOVERY_FILE_MISSING");
    }
    const stagedBytes = await this.fileStorage.read(operation.staging_key);
    this.assertPreparedFile(stagedBytes, expectedSize, operation.prepared_content_sha256);

    let promoted = this.fileStorage.move
      ? await this.fileStorage.move(operation.staging_key, promotedKey)
      : null;
    if (!promoted) {
      promoted = await this.fileStorage.save({
        area: "private",
        directory: `sale-order-attachments/${operation.sale_order_id}`,
        filename: this.fileStorage.resolve(promotedKey).filename,
        extension: this.fileStorage.resolve(promotedKey).filename.split(".").pop() ?? "webp",
        buffer: stagedBytes,
      });
    }
    const promotedBytes = await this.fileStorage.read(promoted.key);
    this.assertPreparedFile(promotedBytes, expectedSize, operation.prepared_content_sha256);
    const checkpointResult = await this.entityManager.query(
      `UPDATE payment_evidence_upload_operations
       SET status = 'PROMOTED', staging_key = NULL, promoted_key = $2,
           updated_at = now(), last_error = NULL
       WHERE id = $1 AND lease_until > now()
       RETURNING id`,
      [operation.id, promoted.key],
    );
    const checkpointRows = Array.isArray(checkpointResult?.[0])
      ? checkpointResult[0] as Array<{ id: string }>
      : checkpointResult as Array<{ id: string }>;
    if (!checkpointRows[0]) throw new Error("RECOVERY_LEASE_LOST");
    return { key: promoted.key, filename: promoted.filename, sizeBytes: promotedBytes.length };
  }

  private async persistRecoveredEvidence(operation: RecoverableEvidenceOperation, file: RecoveredEvidenceFile) {
    return this.entityManager.transaction(async (manager) => {
      const [{ status, is_active: isActive }] = await manager.query<Array<{ status: string; is_active: boolean }>>(
        `SELECT payment.status, order_row.is_active
         FROM sale_payments payment
         JOIN sale_orders order_row ON order_row.id = payment.sale_order_id
         WHERE payment.id = $1 AND payment.sale_order_id = $2
         FOR UPDATE OF payment`,
        [operation.sale_order_payment_id, operation.sale_order_id],
      );
      if (status !== "PENDING_CONFIRMATION" || !isActive) throw new Error("RECOVERY_PAYMENT_NOT_ELIGIBLE");

      const priorRows = await manager.query<Array<{ id: string; content_sha256: string | null; storage_path: string }>>(
        `SELECT id, content_sha256, storage_path FROM sale_order_attachments
         WHERE sale_order_payment_id = $1 AND uploaded_by_user_id = $2 AND upload_idempotency_key = $3
         LIMIT 1 FOR UPDATE`,
        [operation.sale_order_payment_id, operation.uploaded_by_user_id, operation.idempotency_key],
      );
      const prior = priorRows[0];
      if (prior) {
        if (prior.content_sha256 !== operation.source_content_sha256 || prior.storage_path !== file.key) {
          throw new Error("RECOVERY_IDEMPOTENCY_MISMATCH");
        }
        await manager.query(
          `UPDATE payment_evidence_upload_operations
           SET status = 'COMPLETED', attachment_id = $2, staging_key = NULL, promoted_key = NULL,
               lease_until = NULL, completed_at = now(), updated_at = now(), last_error = NULL
           WHERE id = $1`,
          [operation.id, prior.id],
        );
        return false;
      }

      const previousRows = await manager.query<Array<{ id: string }>>(
        `SELECT id FROM sale_order_attachments
         WHERE sale_order_payment_id = $1 AND type = 'PAYMENT_PROOF' AND deleted_at IS NULL
         FOR UPDATE`,
        [operation.sale_order_payment_id],
      );
      if (previousRows.length) {
        await manager.query(
          `UPDATE sale_order_attachments SET deleted_at = now()
           WHERE sale_order_payment_id = $1 AND type = 'PAYMENT_PROOF' AND deleted_at IS NULL`,
          [operation.sale_order_payment_id],
        );
      }
      const [{ id: attachmentId }] = await manager.query<Array<{ id: string }>>(
        `INSERT INTO sale_order_attachments
          (sale_order_id, sale_order_payment_id, type, filename, original_name, mime_type,
           size_bytes, url, storage_path, uploaded_by_user_id, note, upload_idempotency_key, content_sha256)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8, $9, $10, $11, $12)
         RETURNING id`,
        [operation.sale_order_id, operation.sale_order_payment_id, SaleOrderAttachmentType.PAYMENT_PROOF,
          file.filename, operation.original_name, operation.mime_type, file.sizeBytes, file.key,
          operation.uploaded_by_user_id, "Evidencia cargada desde ingresos.", operation.idempotency_key,
          operation.source_content_sha256],
      );
      await manager.query(
        `INSERT INTO sale_order_auditory (sale_order_id, executed_by, action_execution)
         VALUES ($1, $2, 'payment_evidence_attached')`,
        [operation.sale_order_id, operation.uploaded_by_user_id],
      );
      await manager.query(
        `INSERT INTO financial_outbox_events (event_type, aggregate_type, aggregate_id, payload)
         VALUES ('income.payment_evidence_attached', 'sale_payment', $1, $2::jsonb)`,
        [operation.sale_order_payment_id, JSON.stringify({
          incomeId: operation.sale_order_payment_id,
          saleOrderId: operation.sale_order_id,
          actorId: operation.uploaded_by_user_id,
          attachmentId,
          replacedAttachmentIds: previousRows.map(({ id }) => id),
          recovered: true,
        })],
      );
      await manager.query(
        `UPDATE payment_evidence_upload_operations
         SET status = 'COMPLETED', attachment_id = $2, staging_key = NULL, promoted_key = NULL,
             lease_until = NULL, completed_at = now(), updated_at = now(), last_error = NULL
         WHERE id = $1`,
        [operation.id, attachmentId],
      );
      return true;
    });
  }

  private assertPreparedFile(bytes: Buffer, expectedSize: number, expectedHash: string) {
    if (bytes.length !== expectedSize || createHash("sha256").update(bytes).digest("hex") !== expectedHash) {
      throw new Error("RECOVERY_FILE_INTEGRITY_MISMATCH");
    }
  }

  private async releaseClaim(operationId: string, errorCode: string) {
    await this.entityManager.query(
      `UPDATE payment_evidence_upload_operations
       SET lease_until = NULL, last_error = $2, updated_at = now()
       WHERE id = $1 AND status <> 'COMPLETED'`,
      [operationId, errorCode],
    ).catch(() => undefined);
  }

  private errorCode(error: unknown) {
    const candidate = error instanceof Error ? error.message : "RECOVERY_UNKNOWN_ERROR";
    return /^[A-Z0-9_]{1,100}$/.test(candidate) ? candidate : "RECOVERY_UNKNOWN_ERROR";
  }

  private async runSafely() {
    try {
      await this.runOnce();
    } catch (error) {
      this.logger.warn(`income evidence recovery run failed=${this.errorCode(error)}`);
    }
  }
}
