import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateMailMessageActions20260520113000 implements MigrationInterface {
  name = "CreateMailMessageActions20260520113000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
CREATE TABLE IF NOT EXISTS mail_message_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE,
  message_id uuid NULL REFERENCES messages(id) ON DELETE SET NULL,
  action_key varchar(160) NOT NULL UNIQUE,
  action_type varchar(80) NOT NULL,
  target_entity_type varchar(80) NOT NULL,
  target_entity_id varchar(120) NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'PENDING',
  completed_by_user_id uuid NULL REFERENCES users(user_id) ON DELETE SET NULL,
  completed_at timestamp NULL,
  version integer NOT NULL DEFAULT 1,
  metadata jsonb NULL DEFAULT '{}'::jsonb,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mail_message_actions_thread
  ON mail_message_actions(thread_id);

CREATE INDEX IF NOT EXISTS idx_mail_message_actions_message
  ON mail_message_actions(message_id);

CREATE INDEX IF NOT EXISTS idx_mail_message_actions_status
  ON mail_message_actions(status);

CREATE TABLE IF NOT EXISTS mail_message_action_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id uuid NOT NULL REFERENCES mail_message_actions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  can_execute boolean NOT NULL DEFAULT true,
  seen_at timestamp NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),
  CONSTRAINT uq_mail_message_action_recipients UNIQUE (action_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_mail_message_action_recipients_action
  ON mail_message_action_recipients(action_id);

CREATE INDEX IF NOT EXISTS idx_mail_message_action_recipients_user
  ON mail_message_action_recipients(user_id);
`);
  }

  public async down(): Promise<void> {
    // Non-destructive by design.
  }
}