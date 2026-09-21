import { MigrationInterface, QueryRunner } from "typeorm";

export class CreatePaymentAllocationsAndLifecycle20260921150000 implements MigrationInterface {
  name = "CreatePaymentAllocationsAndLifecycle20260921150000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS payment_allocations (
        allocation_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        payment_id uuid NOT NULL REFERENCES payment_documents(pay_doc_id) ON DELETE RESTRICT,
        account_payable_id uuid NOT NULL REFERENCES accounts_payable(account_payable_id) ON DELETE RESTRICT,
        amount numeric(12,2) NOT NULL,
        currency currency_type NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT chk_payment_allocations_positive_amount CHECK (amount > 0)
      );
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_allocations_payment_payable ON payment_allocations (payment_id, account_payable_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_payment_allocations_payable ON payment_allocations (account_payable_id);`);
    await queryRunner.query(`
      INSERT INTO payment_allocations (payment_id, account_payable_id, amount, currency)
      SELECT pd.pay_doc_id, pd.account_payable_id, pd.amount, pd.currency
      FROM payment_documents pd
      WHERE pd.account_payable_id IS NOT NULL AND pd.status = 'APPROVED'
        AND NOT EXISTS (SELECT 1 FROM payment_allocations pa WHERE pa.payment_id = pd.pay_doc_id AND pa.account_payable_id = pd.account_payable_id);
    `);
    await queryRunner.query(`UPDATE payment_documents SET status = 'POSTED' WHERE status = 'APPROVED';`);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE payment_documents ADD CONSTRAINT chk_payment_documents_lifecycle_status
          CHECK (status IN ('DRAFT','SCHEDULED','PENDING_APPROVAL','POSTED','APPROVED','REJECTED','VOIDED')) NOT VALID;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
  }

  public async down(): Promise<void> {}
}
