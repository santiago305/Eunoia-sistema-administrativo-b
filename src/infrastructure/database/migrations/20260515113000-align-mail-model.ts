import { MigrationInterface, QueryRunner } from "typeorm";

export class AlignMailModel20260515113000 implements MigrationInterface {
  name = "AlignMailModel20260515113000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
-- Alineacion del modelo de datos Mail Center vs plan objetivo.
-- Fecha: 2026-05-15

-- 1) message_threads.origin_module debe existir siempre.
UPDATE message_threads
SET origin_module = 'corporate'
WHERE origin_module IS NULL OR btrim(origin_module) = '';

ALTER TABLE message_threads
  ALTER COLUMN origin_module SET NOT NULL;

-- 2) Check constraints para columnas categoricas principales.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_messages_kind'
  ) THEN
    ALTER TABLE messages
      ADD CONSTRAINT chk_messages_kind
      CHECK (kind IN ('SYSTEM_NOTIFICATION', 'USER_MESSAGE', 'SYSTEM_MESSAGE'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_messages_sender_type'
  ) THEN
    ALTER TABLE messages
      ADD CONSTRAINT chk_messages_sender_type
      CHECK (sender_type IN ('USER', 'SYSTEM'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_messages_status'
  ) THEN
    ALTER TABLE messages
      ADD CONSTRAINT chk_messages_status
      CHECK (status IN ('DRAFT', 'SENT', 'FAILED', 'SCHEDULED', 'ARCHIVED'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_message_user_states_relation_type'
  ) THEN
    ALTER TABLE message_user_states
      ADD CONSTRAINT chk_message_user_states_relation_type
      CHECK (relation_type IN ('SENDER', 'TO', 'CC', 'BCC', 'SYSTEM_RECIPIENT'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_message_labels_type'
  ) THEN
    ALTER TABLE message_labels
      ADD CONSTRAINT chk_message_labels_type
      CHECK (type IN ('SYSTEM', 'MODULE', 'CUSTOM'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_message_recipients_type'
  ) THEN
    ALTER TABLE message_recipients
      ADD CONSTRAINT chk_message_recipients_type
      CHECK (recipient_type IN ('TO', 'CC', 'BCC'));
  END IF;
END $$;

-- 3) Adjuntos: debe pertenecer a mensaje o draft (al menos uno)
-- y no debe pertenecer a ambos al mismo tiempo.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_message_attachments_owner_present'
  ) THEN
    ALTER TABLE message_attachments
      ADD CONSTRAINT chk_message_attachments_owner_present
      CHECK (message_id IS NOT NULL OR draft_id IS NOT NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_message_attachments_owner_exclusive'
  ) THEN
    ALTER TABLE message_attachments
      ADD CONSTRAINT chk_message_attachments_owner_exclusive
      CHECK (NOT (message_id IS NOT NULL AND draft_id IS NOT NULL));
  END IF;
END $$;

`);
  }

  public async down(): Promise<void> {
    // Non-destructive by design.
  }
}