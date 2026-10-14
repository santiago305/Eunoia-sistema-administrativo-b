import { MigrationInterface, QueryRunner } from 'typeorm';

/** Durable checkpoints let a retry resume a verified staged/promoted payment proof. */
export class CreatePaymentEvidenceUploadOperations20261013020000 implements MigrationInterface {
  name = 'CreatePaymentEvidenceUploadOperations20261013020000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS payment_evidence_upload_operations (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        sale_order_payment_id uuid NOT NULL,
        sale_order_id uuid NOT NULL,
        uploaded_by_user_id uuid NOT NULL,
        idempotency_key uuid NOT NULL,
        source_content_sha256 varchar(64) NOT NULL,
        prepared_content_sha256 varchar(64),
        original_name varchar(255) NOT NULL,
        mime_type varchar(120) NOT NULL,
        size_bytes bigint NOT NULL,
        status varchar(20) NOT NULL DEFAULT 'PREPARING',
        staging_key varchar(500),
        promoted_key varchar(500),
        quarantine_key varchar(500),
        attachment_id uuid,
        lease_until timestamptz,
        attempts integer NOT NULL DEFAULT 0,
        last_error varchar(500),
        completed_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT chk_payment_evidence_upload_operation_status
          CHECK (status IN ('PREPARING', 'STAGED', 'PROMOTED', 'COMPLETED', 'FAILED', 'QUARANTINED')),
        CONSTRAINT chk_payment_evidence_upload_operation_size CHECK (size_bytes > 0)
      );
      CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_evidence_upload_operation_key
        ON payment_evidence_upload_operations (sale_order_payment_id, uploaded_by_user_id, idempotency_key);
      CREATE INDEX IF NOT EXISTS idx_payment_evidence_upload_operation_recovery
        ON payment_evidence_upload_operations (status, lease_until, updated_at);
    `);
  }

  async down(): Promise<void> {
    // Forward-only: operation checkpoints reference financial evidence history.
  }
}
