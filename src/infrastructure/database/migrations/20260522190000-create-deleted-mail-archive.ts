import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateDeletedMailArchive20260522190000 implements MigrationInterface {
  name = "CreateDeletedMailArchive20260522190000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS deleted_mail_messages (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        source_message_id uuid NOT NULL,
        source_thread_id uuid NULL,
        subject varchar(255) NOT NULL,
        origin_module varchar(60) NOT NULL,
        kind varchar(40) NOT NULL,
        sender_type varchar(20) NOT NULL,
        payload jsonb NOT NULL,
        archived_reason varchar(80) NOT NULL DEFAULT 'ALL_STATES_HIDDEN',
        source_created_at timestamptz NULL,
        source_sent_at timestamptz NULL,
        source_last_hidden_at timestamptz NULL,
        archived_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS deleted_mail_message_user_states (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        source_state_id uuid NOT NULL,
        source_message_id uuid NOT NULL,
        source_user_id uuid NOT NULL,
        relation_type varchar(20) NOT NULL,
        payload jsonb NOT NULL,
        source_permanently_hidden_at timestamptz NULL,
        archived_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS deleted_mail_attachments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        source_attachment_id uuid NOT NULL,
        source_message_id uuid NULL,
        original_name varchar(255) NOT NULL,
        stored_name varchar(255) NOT NULL,
        mime_type varchar(120) NOT NULL,
        size_bytes bigint NOT NULL,
        storage_key varchar(500) NOT NULL,
        attachment_kind varchar(20) NOT NULL DEFAULT 'file',
        payload jsonb NULL,
        archived_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS deleted_mail_audit_logs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        source_audit_log_id uuid NOT NULL,
        source_message_id uuid NULL,
        source_thread_id uuid NULL,
        actor_user_id uuid NULL,
        action varchar(80) NOT NULL,
        metadata jsonb NULL,
        source_created_at timestamptz NULL,
        archived_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_deleted_mail_messages_source_message_id ON deleted_mail_messages(source_message_id);`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_deleted_mail_message_user_states_source_state_id ON deleted_mail_message_user_states(source_state_id);`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_deleted_mail_attachments_source_attachment_id ON deleted_mail_attachments(source_attachment_id);`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_deleted_mail_audit_logs_source_audit_log_id ON deleted_mail_audit_logs(source_audit_log_id);`);
  }

  public async down(): Promise<void> {
    // Non-destructive by design.
  }
}
