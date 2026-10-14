import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';

export interface RecordIncomeEvidenceAccessInput {
  incomeId: string;
  saleOrderId: string;
  attachmentId: string | null;
  userId: string;
  inherited: boolean;
  content: Buffer;
}

/** Stores access metadata only; payment evidence bytes and storage paths are never copied to the audit log. */
@Injectable()
export class IncomeEvidenceAccessUsecase {
  constructor(@InjectEntityManager() private readonly entityManager: EntityManager) {}

  async record(input: RecordIncomeEvidenceAccessInput): Promise<void> {
    const contentSha256 = createHash('sha256').update(input.content).digest('hex');
    await this.entityManager.query(
      `INSERT INTO payment_evidence_access_logs
        (income_id, sale_order_id, evidence_attachment_id, actor_user_id, inherited, content_sha256, size_bytes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [input.incomeId, input.saleOrderId, input.attachmentId, input.userId, input.inherited, contentSha256, input.content.byteLength],
    );
  }

  async list(incomeId: string, limit = 50) {
    const rows: Array<{
      id: string;
      actor_user_id: string;
      evidence_attachment_id: string | null;
      inherited: boolean;
      content_sha256: string;
      size_bytes: string | number;
      accessed_at: Date;
    }> = await this.entityManager.query(
      `SELECT id, actor_user_id, evidence_attachment_id, inherited, content_sha256, size_bytes, accessed_at
       FROM payment_evidence_access_logs
       WHERE income_id = $1
       ORDER BY accessed_at DESC, id DESC
       LIMIT $2`,
      [incomeId, limit],
    );
    return rows.map((row) => ({
      id: row.id,
      actorUserId: row.actor_user_id,
      attachmentId: row.evidence_attachment_id,
      inherited: row.inherited,
      contentSha256: row.content_sha256,
      sizeBytes: Number(row.size_bytes),
      accessedAt: row.accessed_at,
    }));
  }
}
