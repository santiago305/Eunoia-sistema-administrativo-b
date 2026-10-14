import { MigrationInterface, QueryRunner } from 'typeorm';

/** Append-only access history for private payment evidence; intentionally no FK to purgeable evidence revisions. */
export class CreatePaymentEvidenceAccessLogs20261013010000 implements MigrationInterface {
  name = 'CreatePaymentEvidenceAccessLogs20261013010000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS payment_evidence_access_logs (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        income_id uuid NOT NULL,
        sale_order_id uuid NOT NULL,
        evidence_attachment_id uuid,
        actor_user_id uuid NOT NULL,
        inherited boolean NOT NULL DEFAULT false,
        content_sha256 varchar(64) NOT NULL,
        size_bytes bigint NOT NULL CHECK (size_bytes > 0),
        accessed_at timestamptz NOT NULL DEFAULT timezone('America/Lima', CURRENT_TIMESTAMP)
      );
      CREATE INDEX IF NOT EXISTS idx_payment_evidence_access_income_date
        ON payment_evidence_access_logs (income_id, accessed_at DESC, id DESC);
      CREATE INDEX IF NOT EXISTS idx_payment_evidence_access_actor_date
        ON payment_evidence_access_logs (actor_user_id, accessed_at DESC);
    `);
  }

  async down(): Promise<void> {
    // Forward-only: access history must not be erased by a routine rollback.
  }
}
