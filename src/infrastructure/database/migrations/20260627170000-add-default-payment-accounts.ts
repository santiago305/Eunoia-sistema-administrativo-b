import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDefaultPaymentAccounts20260627170000 implements MigrationInterface {
  name = "AddDefaultPaymentAccounts20260627170000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE company_payment_accounts ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false;`);
    await queryRunner.query(`ALTER TABLE supplier_methods ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false;`);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_company_payment_accounts_single_default
      ON company_payment_accounts (company_id)
      WHERE is_default = true
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_supplier_methods_single_default
      ON supplier_methods (supplier_id)
      WHERE is_default = true
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS ux_supplier_methods_single_default`);
    await queryRunner.query(`DROP INDEX IF EXISTS ux_company_payment_accounts_single_default`);
    await queryRunner.query(`ALTER TABLE supplier_methods DROP COLUMN IF EXISTS is_default`);
    await queryRunner.query(`ALTER TABLE company_payment_accounts DROP COLUMN IF EXISTS is_default`);
  }
}
