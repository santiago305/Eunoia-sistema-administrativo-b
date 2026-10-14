import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Canonical income lifecycle used by sale payments.
 *
 * Every non-canonical state needs historical classification. Fail closed
 * before changing the schema instead of silently assigning financial meaning.
 */
export class PaymentLifecycleFourStates20261008000000 implements MigrationInterface {
  name = "PaymentLifecycleFourStates20261008000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    const legacyStatuses: Array<{ status: string; total: number }> = await queryRunner.query(`
      SELECT status, COUNT(*)::int AS total
      FROM sale_payments
      WHERE status IS NULL
         OR status NOT IN ('PENDING_CONFIRMATION', 'POSTED', 'CANCELLED', 'REVERSED')
      GROUP BY status
      ORDER BY status
    `);
    if (legacyStatuses.length > 0) {
      const summary = legacyStatuses.map((row) => `${row.status ?? "NULL"}=${row.total}`).join(", ");
      throw new Error(
        `Migration stopped: unsupported payment lifecycle states need classification (${summary}). ` +
        "Run audit:financial:strict against an authorized copy and resolve each payment with evidence before migrating.",
      );
    }

    await queryRunner.query(`
      ALTER TABLE sale_payments
        ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1,
        ADD COLUMN IF NOT EXISTS posted_at timestamptz NULL,
        ADD COLUMN IF NOT EXISTS accounting_date date NULL;
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
