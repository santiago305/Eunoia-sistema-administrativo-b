import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRecurringPurchaseReminderDeliveries20260710165000 implements MigrationInterface {
  name = "AddRecurringPurchaseReminderDeliveries20260710165000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS recurring_purchase_reminder_deliveries (
        recurring_purchase_reminder_delivery_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        recurring_purchase_template_id uuid NOT NULL REFERENCES recurring_purchase_templates(recurring_purchase_template_id) ON DELETE CASCADE,
        period_key varchar(20) NOT NULL,
        due_date date NOT NULL,
        days_before int NOT NULL,
        sent_at timestamptz NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT chk_recurring_purchase_reminder_deliveries_days_before CHECK (days_before >= 0)
      );
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_recurring_purchase_reminder_deliveries_window
      ON recurring_purchase_reminder_deliveries (recurring_purchase_template_id, period_key, due_date, days_before);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_recurring_purchase_reminder_deliveries_template
      ON recurring_purchase_reminder_deliveries (recurring_purchase_template_id);
    `);
    await queryRunner.query(`
      ALTER TABLE recurring_purchase_templates
      ALTER COLUMN reminder_days_before SET DEFAULT '[7,3,1,0]'::jsonb;
    `);
    await queryRunner.query(`
      UPDATE recurring_purchase_templates
      SET reminder_days_before = '[7,3,1,0]'::jsonb
      WHERE reminder_days_before = '[7,3,1]'::jsonb;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE recurring_purchase_templates
      ALTER COLUMN reminder_days_before SET DEFAULT '[7,3,1]'::jsonb;
    `);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_recurring_purchase_reminder_deliveries_template;`);
    await queryRunner.query(`DROP INDEX IF EXISTS uq_recurring_purchase_reminder_deliveries_window;`);
    await queryRunner.query(`DROP TABLE IF EXISTS recurring_purchase_reminder_deliveries;`);
  }
}
