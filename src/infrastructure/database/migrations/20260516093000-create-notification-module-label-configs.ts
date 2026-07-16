import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateNotificationModuleLabelConfigs20260516093000 implements MigrationInterface {
  name = "CreateNotificationModuleLabelConfigs20260516093000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
CREATE TABLE IF NOT EXISTS notification_module_label_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_key VARCHAR(60) NOT NULL UNIQUE,
  label_id UUID NULL REFERENCES message_labels(id) ON DELETE SET NULL,
  updated_by_user_id UUID NULL REFERENCES users(user_id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_module_label_configs_label_id
  ON notification_module_label_configs(label_id);
`);
  }

  public async down(): Promise<void> {
    // Non-destructive by design.
  }
}
