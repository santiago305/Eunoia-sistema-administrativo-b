import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRecurringPurchaseBillingAnchorDay20260710154000 implements MigrationInterface {
  name = "AddRecurringPurchaseBillingAnchorDay20260710154000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE recurring_purchase_templates
      ADD COLUMN IF NOT EXISTS billing_anchor_day int;
    `);
    await queryRunner.query(`
      UPDATE recurring_purchase_templates
      SET billing_anchor_day = EXTRACT(DAY FROM start_date)::int
      WHERE billing_anchor_day IS NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE recurring_purchase_templates
      ALTER COLUMN billing_anchor_day SET NOT NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE recurring_purchase_templates
      ADD CONSTRAINT chk_recurring_purchase_templates_billing_anchor_day
      CHECK (billing_anchor_day BETWEEN 1 AND 31);
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE recurring_purchase_templates
      DROP CONSTRAINT IF EXISTS chk_recurring_purchase_templates_billing_anchor_day;
    `);
    await queryRunner.query(`
      ALTER TABLE recurring_purchase_templates
      DROP COLUMN IF EXISTS billing_anchor_day;
    `);
  }
}
