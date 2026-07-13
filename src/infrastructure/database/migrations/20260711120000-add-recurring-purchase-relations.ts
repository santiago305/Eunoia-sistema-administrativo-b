import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRecurringPurchaseRelations20260711120000 implements MigrationInterface {
  name = "AddRecurringPurchaseRelations20260711120000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE purchase_orders
      ADD CONSTRAINT fk_purchase_orders_recurring_template
      FOREIGN KEY (recurring_template_id)
      REFERENCES recurring_purchase_templates(recurring_purchase_template_id)
      ON DELETE SET NULL
      NOT VALID;
    `).catch((error) => {
      if (error?.code !== "42710") throw error;
    });

    await queryRunner.query(`
      ALTER TABLE recurring_purchase_templates
      ADD CONSTRAINT fk_recurring_purchase_templates_last_purchase
      FOREIGN KEY (last_generated_purchase_id)
      REFERENCES purchase_orders(po_id)
      ON DELETE SET NULL
      NOT VALID;
    `).catch((error) => {
      if (error?.code !== "42710") throw error;
    });

    await queryRunner.query(`
      ALTER TABLE recurring_purchase_templates
      ADD CONSTRAINT fk_recurring_purchase_templates_last_account_payable
      FOREIGN KEY (last_generated_account_payable_id)
      REFERENCES accounts_payable(account_payable_id)
      ON DELETE SET NULL
      NOT VALID;
    `).catch((error) => {
      if (error?.code !== "42710") throw error;
    });

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_recurring_purchase_templates_last_purchase
      ON recurring_purchase_templates (last_generated_purchase_id);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_recurring_purchase_templates_last_account_payable
      ON recurring_purchase_templates (last_generated_account_payable_id);
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE recurring_purchase_templates
      DROP CONSTRAINT IF EXISTS fk_recurring_purchase_templates_last_account_payable;
    `);
    await queryRunner.query(`
      ALTER TABLE recurring_purchase_templates
      DROP CONSTRAINT IF EXISTS fk_recurring_purchase_templates_last_purchase;
    `);
    await queryRunner.query(`
      ALTER TABLE purchase_orders
      DROP CONSTRAINT IF EXISTS fk_purchase_orders_recurring_template;
    `);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_recurring_purchase_templates_last_account_payable;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_recurring_purchase_templates_last_purchase;`);
  }
}
