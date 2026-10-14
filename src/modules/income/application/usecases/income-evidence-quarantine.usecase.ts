import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { createHash } from 'node:crypto';
import { EntityManager } from 'typeorm';
import { FILE_STORAGE, FileStorage } from 'src/shared/application/ports/file-storage.port';
import { SaleOrderAttachmentType } from 'src/modules/sale-order-attachments/domain/value-objects/sale-order-attachment-type';
import { SaleOrdersRealtimeService } from 'src/modules/sale-orders/infrastructure/realtime/sale-orders-realtime.service';

type QuarantinedOperation = {
  id: string; sale_order_payment_id: string; sale_order_id: string; uploaded_by_user_id: string;
  idempotency_key: string; source_content_sha256: string; prepared_content_sha256: string | null;
  original_name: string; mime_type: string; size_bytes: string | number; quarantine_key: string | null;
  last_error: string | null; attempts: number; created_at: Date; updated_at: Date;
  status?: string; attachment_id?: string | null; recovered_by_user_id?: string | null; recovery_reason?: string | null;
};

@Injectable()
export class IncomeEvidenceQuarantineUsecase {
  constructor(
    @InjectEntityManager() private readonly entityManager: EntityManager,
    @Inject(FILE_STORAGE) private readonly fileStorage: FileStorage,
    private readonly realtime: SaleOrdersRealtimeService,
  ) {}

  async list(incomeId: string) {
    const rows = await this.entityManager.query<QuarantinedOperation[]>(
      `SELECT id, sale_order_payment_id, sale_order_id, uploaded_by_user_id,
              original_name, mime_type, size_bytes, last_error, attempts, created_at, updated_at,
              quarantine_key
       FROM payment_evidence_upload_operations
       WHERE sale_order_payment_id = $1 AND status = 'QUARANTINED'
       ORDER BY updated_at DESC, id DESC LIMIT 100`, [incomeId]);
    return Promise.all(rows.map(async (row) => ({
      id: row.id, incomeId: row.sale_order_payment_id, saleOrderId: row.sale_order_id,
      uploadedByUserId: row.uploaded_by_user_id, originalName: row.original_name,
      mimeType: row.mime_type, sizeBytes: Number(row.size_bytes), errorCode: row.last_error,
      attempts: row.attempts, createdAt: row.created_at, updatedAt: row.updated_at,
      fileAvailable: Boolean(row.quarantine_key && this.isValidQuarantineKey(row.id, row.quarantine_key)
        && await this.fileStorage.exists(row.quarantine_key)),
    })));
  }

  async recover(incomeId: string, operationId: string, actorId: string, reason: string) {
    const normalizedReason = reason?.trim();
    if (!normalizedReason || normalizedReason.length < 5 || normalizedReason.length > 500) {
      throw new ConflictException('Indica un motivo de recuperación de entre 5 y 500 caracteres.');
    }
    const operation = await this.getOperation(incomeId, operationId);
    if (operation.status === 'COMPLETED') {
      if (operation.recovered_by_user_id === actorId && operation.recovery_reason === normalizedReason && operation.attachment_id) {
        return { operationId, incomeId, attachmentId: operation.attachment_id, status: 'COMPLETED' as const };
      }
      throw new ConflictException('La operación ya fue recuperada con otro actor o motivo.');
    }
    if (!operation.quarantine_key || !this.isValidQuarantineKey(operation.id, operation.quarantine_key)) {
      throw new ConflictException('La ruta del archivo en cuarentena no es válida.');
    }
    if (!operation.prepared_content_sha256) throw new ConflictException('La operación no conserva la huella del archivo preparado.');
    const expectedSize = Number(operation.size_bytes);
    if (!Number.isSafeInteger(expectedSize) || expectedSize <= 0) throw new ConflictException('El tamaño registrado no es válido.');

    const bytes = await this.fileStorage.read(operation.quarantine_key).catch(() => null);
    if (!bytes) throw new NotFoundException('El archivo en cuarentena ya no está disponible.');
    this.assertIntegrity(bytes, expectedSize, operation.prepared_content_sha256);
    await this.assertPaymentEligible(operation);

    const extension = this.fileStorage.resolve(operation.quarantine_key).filename.split('.').pop() || 'webp';
    const targetKey = `private/sale-order-attachments/${operation.sale_order_id}/${operation.id}.${extension}`;
    let targetBytes: Buffer;
    if (await this.fileStorage.exists(targetKey)) {
      targetBytes = await this.fileStorage.read(targetKey);
      this.assertIntegrity(targetBytes, expectedSize, operation.prepared_content_sha256);
    } else {
      try {
        const stored = await this.fileStorage.save({ area: 'private', directory: `sale-order-attachments/${operation.sale_order_id}`,
          filename: `${operation.id}.${extension}`, extension, buffer: bytes });
        if (stored.key !== targetKey) throw new ConflictException('El almacenamiento generó una ruta inesperada; el original se conserva en cuarentena.');
        targetBytes = await this.fileStorage.read(stored.key);
      } catch (error) {
        // A concurrent, identical recovery may have created the deterministic target.
        if (!await this.fileStorage.exists(targetKey)) throw error;
        targetBytes = await this.fileStorage.read(targetKey);
      }
      this.assertIntegrity(targetBytes, expectedSize, operation.prepared_content_sha256);
    }
    const filename = this.fileStorage.resolve(targetKey).filename;

    const outcome = await this.entityManager.transaction(async (manager) => {
      const locked = await manager.query<QuarantinedOperation[]>(
        `SELECT id, sale_order_payment_id, sale_order_id, uploaded_by_user_id, idempotency_key,
                source_content_sha256, prepared_content_sha256, original_name, mime_type,
                size_bytes, quarantine_key, last_error, attempts, created_at, updated_at,
                status, attachment_id, recovered_by_user_id, recovery_reason
         FROM payment_evidence_upload_operations WHERE id = $1 AND sale_order_payment_id = $2
         FOR UPDATE`, [operationId, incomeId]);
      if (!locked[0] || locked[0].quarantine_key !== operation.quarantine_key) {
        throw new ConflictException('La operación cambió; actualiza la lista e inténtalo de nuevo.');
      }
      if (locked[0].status === 'COMPLETED') {
        if (locked[0].recovered_by_user_id === actorId
          && locked[0].recovery_reason === normalizedReason
          && locked[0].attachment_id) {
          return {
            result: { operationId, incomeId, attachmentId: locked[0].attachment_id, status: 'COMPLETED' as const },
            replayed: true,
          };
        }
        throw new ConflictException('La operaciÃ³n ya fue recuperada con otro actor o motivo.');
      }
      if (locked[0].status !== 'QUARANTINED') {
        throw new ConflictException('La operaciÃ³n ya no se encuentra en cuarentena.');
      }
      await this.assertPaymentEligible(operation, manager);
      const prior = await manager.query<Array<{ id: string; content_sha256: string | null; storage_path: string }>>(
        `SELECT id, content_sha256, storage_path FROM sale_order_attachments
         WHERE sale_order_payment_id = $1 AND uploaded_by_user_id = $2 AND upload_idempotency_key = $3
         LIMIT 1 FOR UPDATE`, [incomeId, operation.uploaded_by_user_id, operation.idempotency_key]);
      let attachmentId = prior[0]?.id;
      if (prior[0]) {
        if (prior[0].content_sha256 !== operation.source_content_sha256 || prior[0].storage_path !== targetKey) {
          throw new ConflictException('La clave de idempotencia ya pertenece a otra evidencia.');
        }
      } else {
        const previous = await manager.query<Array<{ id: string }>>(
          `SELECT id FROM sale_order_attachments WHERE sale_order_payment_id = $1
           AND type = 'PAYMENT_PROOF' AND deleted_at IS NULL FOR UPDATE`, [incomeId]);
        if (previous.length) await manager.query(
          `UPDATE sale_order_attachments SET deleted_at = now()
           WHERE sale_order_payment_id = $1 AND type = 'PAYMENT_PROOF' AND deleted_at IS NULL`, [incomeId]);
        const inserted = await manager.query<Array<{ id: string }>>(
          `INSERT INTO sale_order_attachments
             (sale_order_id, sale_order_payment_id, type, filename, original_name, mime_type, size_bytes,
              url, storage_path, uploaded_by_user_id, note, upload_idempotency_key, content_sha256)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8,$9,$10,$11,$12) RETURNING id`,
          [operation.sale_order_id, incomeId, SaleOrderAttachmentType.PAYMENT_PROOF, filename,
            operation.original_name, operation.mime_type, expectedSize, targetKey, operation.uploaded_by_user_id,
            `Evidencia recuperada de cuarentena por ${actorId}. Motivo: ${normalizedReason}`,
            operation.idempotency_key, operation.source_content_sha256]);
        attachmentId = inserted[0].id;
      }
      await manager.query(
        `INSERT INTO sale_order_auditory (sale_order_id, executed_by, action_execution)
         VALUES ($1, $2, 'payment_evidence_quarantine_recovered')`, [operation.sale_order_id, actorId]);
      await manager.query(
        `INSERT INTO financial_outbox_events (event_type, aggregate_type, aggregate_id, payload)
         VALUES ('income.payment_evidence_quarantine_recovered', 'sale_payment', $1, $2::jsonb)`,
        [incomeId, JSON.stringify({ incomeId, saleOrderId: operation.sale_order_id, actorId, attachmentId, reason: normalizedReason })]);
      await manager.query(
        `UPDATE payment_evidence_upload_operations SET status = 'COMPLETED', attachment_id = $2,
           staging_key = NULL, promoted_key = NULL, lease_until = NULL, completed_at = now(), updated_at = now(),
           last_error = NULL, recovered_by_user_id = $3, recovery_reason = $4, recovered_at = now()
         WHERE id = $1`, [operation.id, attachmentId, actorId, normalizedReason]);
      return {
        result: { operationId, incomeId, attachmentId, status: 'COMPLETED' as const },
        replayed: false,
      };
    });
    if (!outcome.replayed) {
      try {
        this.realtime.emitToAllConnected('sale-orders.updated', {
          updated: 1, saleOrderIds: [operation.sale_order_id], incomeEvent: 'payment_evidence_quarantine_recovered',
        });
        this.realtime.emitToAllConnected('income.updated', {
          incomeId, saleOrderId: operation.sale_order_id, reason: 'payment_evidence_quarantine_recovered',
        });
      } catch {
        // A websocket outage must not undo or mask the committed evidence recovery.
      }
    }
    return outcome.result;
  }

  private async getOperation(incomeId: string, operationId: string) {
    const rows = await this.entityManager.query<QuarantinedOperation[]>(
      `SELECT id, sale_order_payment_id, sale_order_id, uploaded_by_user_id, idempotency_key,
              source_content_sha256, prepared_content_sha256, original_name, mime_type, size_bytes,
              quarantine_key, last_error, attempts, created_at, updated_at, status, attachment_id,
              recovered_by_user_id, recovery_reason
       FROM payment_evidence_upload_operations WHERE id = $1 AND sale_order_payment_id = $2
         AND status IN ('QUARANTINED', 'COMPLETED')`,
      [operationId, incomeId]);
    if (!rows[0]) throw new NotFoundException('No se encontró la operación en cuarentena para este ingreso.');
    return rows[0];
  }

  private async assertPaymentEligible(operation: QuarantinedOperation, manager: EntityManager = this.entityManager) {
    const rows = await manager.query<Array<{ status: string; is_active: boolean }>>(
      `SELECT payment.status, order_row.is_active FROM sale_payments payment
       JOIN sale_orders order_row ON order_row.id = payment.sale_order_id
       WHERE payment.id = $1 AND payment.sale_order_id = $2 FOR UPDATE OF payment, order_row`,
      [operation.sale_order_payment_id, operation.sale_order_id]);
    if (!rows[0] || rows[0].status !== 'PENDING_CONFIRMATION' || !rows[0].is_active) {
      throw new ConflictException('Solo se puede recuperar evidencia de un ingreso pendiente de confirmación y pedido activo.');
    }
  }

  private isValidQuarantineKey(operationId: string, key: string) {
    return key.startsWith(`quarantine/payment-evidence/${operationId}/`)
      && !key.includes('..') && !key.includes('\\') && !key.startsWith('/');
  }

  private assertIntegrity(bytes: Buffer, expectedSize: number, expectedHash: string) {
    if (bytes.length !== expectedSize || createHash('sha256').update(bytes).digest('hex') !== expectedHash) {
      throw new ConflictException('La evidencia no supera la validación de integridad; permanece en cuarentena.');
    }
  }
}
