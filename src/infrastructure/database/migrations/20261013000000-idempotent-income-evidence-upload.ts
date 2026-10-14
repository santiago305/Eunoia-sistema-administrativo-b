import { MigrationInterface, QueryRunner } from 'typeorm';

/** Persist the upload command identity and digest so retries return one revision. */
export class IdempotentIncomeEvidenceUpload20261013000000
  implements MigrationInterface
{
  name = 'IdempotentIncomeEvidenceUpload20261013000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE sale_order_attachments
        ADD COLUMN IF NOT EXISTS upload_idempotency_key uuid NULL,
        ADD COLUMN IF NOT EXISTS content_sha256 varchar(64) NULL;

      CREATE UNIQUE INDEX IF NOT EXISTS uq_sale_payment_evidence_upload_idempotency
        ON sale_order_attachments (
          sale_order_payment_id,
          uploaded_by_user_id,
          upload_idempotency_key
        )
        WHERE upload_idempotency_key IS NOT NULL;
    `);
  }

  async down(): Promise<void> {
    // Forward-only: retain upload identity with the financial evidence record.
  }
}
