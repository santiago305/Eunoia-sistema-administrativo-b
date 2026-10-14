import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectEntityManager } from "@nestjs/typeorm";
import { EntityManager } from "typeorm";

type EvidenceRevisionRow = {
  id: string;
  sale_order_id: string;
  sale_order_payment_id: string;
  filename: string;
  original_name: string;
  mime_type: string;
  size_bytes: number | string;
  storage_path: string;
  uploaded_by_user_id: string | null;
  note: string | null;
  content_sha256: string | null;
  created_at: Date | string;
  deleted_at: Date | string | null;
};

/** Lists retained payment-proof revisions without exposing their storage keys. */
@Injectable()
export class IncomeEvidenceRevisionsUsecase {
  constructor(@InjectEntityManager() private readonly entityManager: EntityManager) {}

  async list(incomeId: string, limit = 50) {
    const rows = await this.entityManager.query<EvidenceRevisionRow[]>(
      `SELECT id, sale_order_id, sale_order_payment_id, filename, original_name,
              mime_type, size_bytes, uploaded_by_user_id, note, content_sha256,
              created_at, deleted_at
       FROM sale_order_attachments
       WHERE sale_order_payment_id = $1 AND type IN ('PAYMENT_PROOF', 'SALE_PAYMENT_PROOF')
       ORDER BY created_at DESC, id DESC
       LIMIT $2`,
      [incomeId, limit],
    );
    return rows.map((row) => this.toOutput(row));
  }

  async get(incomeId: string, attachmentId: string) {
    const rows = await this.entityManager.query<EvidenceRevisionRow[]>(
      `SELECT id, sale_order_id, sale_order_payment_id, filename, original_name,
              mime_type, size_bytes, storage_path, uploaded_by_user_id, note,
              content_sha256, created_at, deleted_at
       FROM sale_order_attachments
       WHERE id = $1 AND sale_order_payment_id = $2
         AND type IN ('PAYMENT_PROOF', 'SALE_PAYMENT_PROOF')
       LIMIT 1`,
      [attachmentId, incomeId],
    );
    const row = rows[0];
    if (!row) throw new NotFoundException("No existe esa revision de evidencia para el ingreso.");
    return {
      ...this.toOutput(row),
      saleOrderId: row.sale_order_id,
      storagePath: row.storage_path,
    };
  }

  private toOutput(row: EvidenceRevisionRow) {
    return {
      attachmentId: row.id,
      incomeId: row.sale_order_payment_id,
      originalName: row.original_name,
      mimeType: row.mime_type,
      sizeBytes: Number(row.size_bytes),
      uploadedByUserId: row.uploaded_by_user_id,
      note: row.note,
      contentSha256: row.content_sha256,
      createdAt: new Date(row.created_at).toISOString(),
      isCurrent: row.deleted_at === null,
    };
  }
}
