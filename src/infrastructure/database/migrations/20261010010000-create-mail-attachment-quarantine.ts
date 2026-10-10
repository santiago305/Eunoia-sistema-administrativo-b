import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMailAttachmentQuarantine20261010010000 implements MigrationInterface {
  name = 'CreateMailAttachmentQuarantine20261010010000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS mail_attachment_quarantines (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        run_id uuid NOT NULL,
        attachment_id uuid NULL REFERENCES message_attachments(id) ON DELETE SET NULL,
        original_key varchar(500) NOT NULL,
        quarantine_key varchar(500) NOT NULL,
        sha256 varchar(64) NOT NULL,
        size_bytes bigint NOT NULL,
        reason varchar(255) NOT NULL,
        status varchar(20) NOT NULL,
        approved_by_user_id uuid NULL REFERENCES users(user_id) ON DELETE SET NULL,
        restored_at timestamptz NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT chk_mail_attachment_quarantine_status
          CHECK (status IN ('CANDIDATE', 'QUARANTINED', 'RESTORED', 'PURGED'))
      );
      CREATE INDEX IF NOT EXISTS idx_mail_attachment_quarantines_status_created
        ON mail_attachment_quarantines (status, created_at);
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS mail_attachment_quarantines');
  }
}
