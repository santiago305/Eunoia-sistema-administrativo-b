import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMailAttachmentOperations20261010000000 implements MigrationInterface {
  name = 'CreateMailAttachmentOperations20261010000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS mail_attachment_operations (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        message_id uuid NULL REFERENCES messages(id) ON DELETE SET NULL,
        draft_id uuid NULL REFERENCES messages(id) ON DELETE SET NULL,
        idempotency_key varchar(160) NULL,
        status varchar(20) NOT NULL,
        attachment_id uuid NULL REFERENCES message_attachments(id) ON DELETE SET NULL,
        storage_key varchar(500) NULL,
        expected_size_bytes bigint NOT NULL,
        actual_size_bytes bigint NULL,
        sha256 varchar(64) NULL,
        attempts integer NOT NULL DEFAULT 0,
        last_error text NULL,
        completed_at timestamptz NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT chk_mail_attachment_operations_status
          CHECK (status IN ('PENDING', 'STAGED', 'REGISTERED', 'ACTIVE', 'FAILED'))
      );
      CREATE UNIQUE INDEX IF NOT EXISTS uq_mail_attachment_operations_idempotency
        ON mail_attachment_operations (user_id, idempotency_key)
        WHERE idempotency_key IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_mail_attachment_operations_status_created
        ON mail_attachment_operations (status, created_at);
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS mail_attachment_operations');
  }
}
