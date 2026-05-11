import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateCorporateMessagingCore20260511000000 implements MigrationInterface {
  name = "CreateCorporateMessagingCore20260511000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS message_threads (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        subject varchar(255) NOT NULL,
        created_by_user_id uuid NULL REFERENCES users(user_id) ON DELETE SET NULL,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now(),
        last_message_at timestamp NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        thread_id uuid NULL REFERENCES message_threads(id) ON DELETE SET NULL,
        parent_message_id uuid NULL REFERENCES messages(id) ON DELETE SET NULL,
        kind varchar(40) NOT NULL,
        origin_module varchar(60) NOT NULL,
        source_entity_type varchar(80) NULL,
        source_entity_id uuid NULL,
        sender_type varchar(20) NOT NULL,
        sender_user_id uuid NULL REFERENCES users(user_id) ON DELETE SET NULL,
        created_by_user_id uuid NULL REFERENCES users(user_id) ON DELETE SET NULL,
        subject varchar(255) NOT NULL,
        body_html text NOT NULL,
        body_text text NOT NULL,
        body_json jsonb NULL,
        status varchar(20) NOT NULL,
        is_draft boolean NOT NULL DEFAULT false,
        draft_expires_at timestamp NULL,
        sent_at timestamp NULL,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS message_recipients (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
        recipient_user_id uuid NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        recipient_email varchar(255) NOT NULL,
        recipient_type varchar(10) NOT NULL DEFAULT 'TO',
        read_at timestamp NULL,
        starred_at timestamp NULL,
        deleted_at timestamp NULL,
        trash_expires_at timestamp NULL,
        permanently_deleted_at timestamp NULL,
        delivered_at timestamp NULL,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now(),
        CONSTRAINT uq_message_recipient UNIQUE (message_id, recipient_user_id, recipient_type)
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS message_attachments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
        original_name varchar(255) NOT NULL,
        stored_name varchar(255) NOT NULL,
        mime_type varchar(120) NOT NULL,
        size_bytes bigint NOT NULL,
        storage_key varchar(500) NOT NULL,
        public_url text NULL,
        uploaded_by_user_id uuid NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
        created_at timestamp NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS message_search_history (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        query varchar(255) NOT NULL,
        used_count integer NOT NULL DEFAULT 1,
        last_used_at timestamp NOT NULL DEFAULT now(),
        created_at timestamp NOT NULL DEFAULT now(),
        CONSTRAINT uq_message_search_user_query UNIQUE (user_id, query)
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS message_audit_logs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        message_id uuid NULL REFERENCES messages(id) ON DELETE SET NULL,
        actor_user_id uuid NULL REFERENCES users(user_id) ON DELETE SET NULL,
        action varchar(60) NOT NULL,
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamp NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_message_recipients_user_deleted_read
      ON message_recipients (recipient_user_id, deleted_at, read_at);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_messages_sent_at
      ON messages (sent_at DESC);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_messages_origin_module
      ON messages (origin_module);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_messages_thread_id
      ON messages (thread_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_messages_drafts_user
      ON messages (created_by_user_id, is_draft, draft_expires_at);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_messages_search
      ON messages USING GIN (
        to_tsvector('spanish', coalesce(subject, '') || ' ' || coalesce(body_text, ''))
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_messages_created_at
      ON messages (created_at DESC);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_message_threads_last_message_at
      ON message_threads (last_message_at DESC);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_message_attachments_message_id
      ON message_attachments (message_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_message_search_history_user_last_used
      ON message_search_history (user_id, last_used_at DESC);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_message_audit_logs_message_created
      ON message_audit_logs (message_id, created_at DESC);
    `);

    await queryRunner.query(`
      ALTER TABLE messages
      ADD CONSTRAINT chk_messages_kind
      CHECK (kind IN ('SYSTEM_NOTIFICATION', 'USER_MESSAGE', 'SYSTEM_MESSAGE'));
    `);

    await queryRunner.query(`
      ALTER TABLE messages
      ADD CONSTRAINT chk_messages_sender_type
      CHECK (sender_type IN ('USER', 'SYSTEM'));
    `);

    await queryRunner.query(`
      ALTER TABLE messages
      ADD CONSTRAINT chk_messages_status
      CHECK (status IN ('DRAFT', 'SENT', 'FAILED', 'ARCHIVED'));
    `);

    await queryRunner.query(`
      ALTER TABLE messages
      ADD CONSTRAINT chk_messages_origin_module
      CHECK (
        origin_module IN (
          'purchases',
          'production',
          'warehouse',
          'catalog',
          'supplies',
          'security',
          'roles',
          'providers',
          'corporate',
          'system'
        )
      );
    `);

    await queryRunner.query(`
      ALTER TABLE message_recipients
      ADD CONSTRAINT chk_message_recipients_type
      CHECK (recipient_type IN ('TO', 'CC', 'BCC'));
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS message_audit_logs;`);
    await queryRunner.query(`DROP TABLE IF EXISTS message_search_history;`);
    await queryRunner.query(`DROP TABLE IF EXISTS message_attachments;`);
    await queryRunner.query(`DROP TABLE IF EXISTS message_recipients;`);
    await queryRunner.query(`DROP TABLE IF EXISTS messages;`);
    await queryRunner.query(`DROP TABLE IF EXISTS message_threads;`);
  }
}
