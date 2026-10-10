import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Canonical income lifecycle used by sale payments.
 *
 * DRAFT/VOIDED were the legacy names. Existing rows are mapped to the
 * equivalent canonical state before the constraint is tightened so this
 * migration is safe for databases that already contain payment history.
 */
export class PaymentLifecycleFourStates20261008000000 implements MigrationInterface {
  name = "PaymentLifecycleFourStates20261008000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE sale_payments
        ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1,
        ADD COLUMN IF NOT EXISTS posted_at timestamptz NULL,
        ADD COLUMN IF NOT EXISTS accounting_date date NULL;
    `);

    await queryRunner.query(`
      UPDATE sale_payments
      SET status = 'PENDING_CONFIRMATION'
      WHERE status = 'DRAFT';
    `);
    await queryRunner.query(`
      UPDATE sale_payments
      SET status = 'REVERSED', posted_at = COALESCE(posted_at, voided_at)
      WHERE status = 'VOIDED';
    `);
    await queryRunner.query(`
      UPDATE sale_payments
      SET posted_at = COALESCE(posted_at, created_at),
          accounting_date = COALESCE(accounting_date, (date AT TIME ZONE 'America/Lima')::date)
      WHERE status = 'POSTED';
    `);

    await queryRunner.query(`
      ALTER TABLE sale_payments
        ALTER COLUMN status SET DEFAULT 'PENDING_CONFIRMATION';
    `);
    await queryRunner.query(`
      ALTER TABLE sale_payments
        DROP CONSTRAINT IF EXISTS chk_sale_payments_lifecycle_status;
    `);
    await queryRunner.query(`
      ALTER TABLE sale_payments
        ADD CONSTRAINT chk_sale_payments_lifecycle_status
        CHECK (status IN ('PENDING_CONFIRMATION','POSTED','CANCELLED','REVERSED')) NOT VALID;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_sale_payments_lifecycle
      ON sale_payments (status, date DESC);
    `);
  }

  async down(): Promise<void> {}
}
