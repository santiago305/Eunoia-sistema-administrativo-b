import { MigrationInterface, QueryRunner } from "typeorm";

export class UnifySalePaymentsWithFinancialPayments20260921160000 implements MigrationInterface {
  name = "UnifySalePaymentsWithFinancialPayments20260921160000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE sale_payments
        ADD COLUMN IF NOT EXISTS company_payment_account_id uuid NULL,
        ADD COLUMN IF NOT EXISTS payment_method_id uuid NULL,
        ADD COLUMN IF NOT EXISTS currency currency_type NOT NULL DEFAULT 'PEN',
        ADD COLUMN IF NOT EXISTS status varchar(20) NOT NULL DEFAULT 'POSTED',
        ADD COLUMN IF NOT EXISTS operation_code varchar(80) NULL,
        ADD COLUMN IF NOT EXISTS voided_at timestamptz NULL,
        ADD COLUMN IF NOT EXISTS voided_by_user_id uuid NULL,
        ADD COLUMN IF NOT EXISTS void_reason text NULL;
    `);
    await queryRunner.query(`
      UPDATE sale_payments
      SET company_payment_account_id = bank_account_id
      WHERE company_payment_account_id IS NULL AND bank_account_id IS NOT NULL;
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_sale_payments_company_payment_account ON sale_payments (company_payment_account_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_sale_payments_payment_method ON sale_payments (payment_method_id);`);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE sale_payments ADD CONSTRAINT fk_sale_payments_receiver_account
          FOREIGN KEY (company_payment_account_id) REFERENCES company_payment_accounts(company_payment_account_id) ON DELETE RESTRICT;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE sale_payments ADD CONSTRAINT fk_sale_payments_method
        FOREIGN KEY (payment_method_id) REFERENCES payment_methods(method_id) ON DELETE RESTRICT;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE sale_payments ADD CONSTRAINT chk_sale_payments_lifecycle_status
          CHECK (status IN ('DRAFT','POSTED','VOIDED')) NOT VALID;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE sale_payments ADD CONSTRAINT chk_sale_payments_nonnegative_amount
          CHECK (amount > 0) NOT VALID;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
  }

  public async down(): Promise<void> {}
}
