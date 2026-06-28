import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPaymentMethodRequiresVoucher20260628120000 implements MigrationInterface {
  name = "AddPaymentMethodRequiresVoucher20260628120000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE payment_methods
      ADD COLUMN IF NOT EXISTS requires_voucher boolean NOT NULL DEFAULT true
    `);
    await queryRunner.query(`
      ALTER TABLE company_methods
      ADD COLUMN IF NOT EXISTS requires_voucher boolean NOT NULL DEFAULT true
    `);
    await queryRunner.query(`
      ALTER TABLE supplier_methods
      ADD COLUMN IF NOT EXISTS requires_voucher boolean NOT NULL DEFAULT true
    `);
    await queryRunner.query(`
      UPDATE payment_methods
      SET requires_voucher = false
      WHERE UPPER(BTRIM(name)) = 'EFECTIVO'
    `);
    await queryRunner.query(`
      UPDATE company_methods cm
      SET requires_voucher = pm.requires_voucher
      FROM payment_methods pm
      WHERE pm.method_id = cm.method_id
    `);
    await queryRunner.query(`
      UPDATE supplier_methods sm
      SET requires_voucher = pm.requires_voucher
      FROM payment_methods pm
      WHERE pm.method_id = sm.method_id
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE supplier_methods DROP COLUMN IF EXISTS requires_voucher`);
    await queryRunner.query(`ALTER TABLE company_methods DROP COLUMN IF EXISTS requires_voucher`);
    await queryRunner.query(`ALTER TABLE payment_methods DROP COLUMN IF EXISTS requires_voucher`);
  }
}
