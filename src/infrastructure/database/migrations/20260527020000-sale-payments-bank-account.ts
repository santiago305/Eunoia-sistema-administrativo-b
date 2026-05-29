import { MigrationInterface, QueryRunner } from "typeorm";

export class SalePaymentsBankAccount20260527020000 implements MigrationInterface {
  name = "SalePaymentsBankAccount20260527020000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE sale_payments
        ADD COLUMN IF NOT EXISTS bank_account_id uuid NULL REFERENCES bank_accounts(id) ON DELETE SET NULL;
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_sale_payments_bank_account_id ON sale_payments (bank_account_id);`);
  }

  public async down(): Promise<void> {
    // No-op: migracion idempotente, no debe eliminar data.
  }
}

