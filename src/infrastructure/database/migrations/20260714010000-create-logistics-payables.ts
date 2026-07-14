import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateLogisticsPayables20260714010000 implements MigrationInterface {
  name = "CreateLogisticsPayables20260714010000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE subsidiaries
      ADD COLUMN IF NOT EXISTS generates_payable boolean NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS payable_supplier_id uuid NULL,
      ADD COLUMN IF NOT EXISTS payable_description varchar(250) NULL
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS sale_order_logistics_payables (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        sale_order_id uuid NOT NULL,
        purchase_id uuid NOT NULL,
        account_payable_id uuid NOT NULL,
        agency_subsidiary_id uuid NOT NULL,
        amount numeric(12,2) NOT NULL,
        status varchar(20) NOT NULL DEFAULT 'ACTIVE',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_sale_order_logistics_payables_sale_order
      ON sale_order_logistics_payables(sale_order_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_sale_order_logistics_payables_account_payable
      ON sale_order_logistics_payables(account_payable_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE IF EXISTS sale_order_logistics_payables");
    await queryRunner.query("ALTER TABLE subsidiaries DROP COLUMN IF EXISTS payable_description");
    await queryRunner.query("ALTER TABLE subsidiaries DROP COLUMN IF EXISTS payable_supplier_id");
    await queryRunner.query("ALTER TABLE subsidiaries DROP COLUMN IF EXISTS generates_payable");
  }
}
