import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateMessageMessageLabels20260512103000 implements MigrationInterface {
  name = "CreateMessageMessageLabels20260512103000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
CREATE TABLE IF NOT EXISTS message_message_labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  label_id uuid NOT NULL REFERENCES message_labels(id) ON DELETE CASCADE,
  created_by_user_id uuid NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_message_message_labels_message_label_user
ON message_message_labels (message_id, label_id, created_by_user_id);

CREATE INDEX IF NOT EXISTS idx_message_message_labels_message_id
ON message_message_labels (message_id);

CREATE INDEX IF NOT EXISTS idx_message_message_labels_label_id
ON message_message_labels (label_id);

`);
  }

  public async down(): Promise<void> {
    // Non-destructive by design.
  }
}