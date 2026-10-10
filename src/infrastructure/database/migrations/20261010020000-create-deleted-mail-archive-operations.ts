import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDeletedMailArchiveOperations20261010020000
  implements MigrationInterface
{
  name = 'CreateDeletedMailArchiveOperations20261010020000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS deleted_mail_archive_operations (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        source_message_id uuid NOT NULL,
        source_attachment_id uuid NOT NULL,
        run_id uuid NOT NULL,
        status varchar(20) NOT NULL DEFAULT 'PENDING',
        original_storage_key varchar(500) NOT NULL,
        final_storage_key varchar(500) NULL,
        expected_size_bytes bigint NULL,
        actual_size_bytes bigint NULL,
        sha256 varchar(64) NULL,
        attempts integer NOT NULL DEFAULT 0,
        last_error text NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        completed_at timestamptz NULL,
        CONSTRAINT chk_deleted_mail_archive_operation_status
          CHECK (status IN ('PENDING', 'MOVED', 'VERIFIED', 'COMMITTED', 'FAILED'))
      );
      CREATE UNIQUE INDEX IF NOT EXISTS uq_deleted_mail_archive_operation_attachment
        ON deleted_mail_archive_operations(source_attachment_id);
      CREATE INDEX IF NOT EXISTS idx_deleted_mail_archive_operations_run_status
        ON deleted_mail_archive_operations(run_id, status);
    `);
  }

  async down(): Promise<void> {
    // Non-destructive by design; archive history must not be dropped automatically.
  }
}
