import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSalePaymentVoidAudit20261005000000 implements MigrationInterface {
  name = "AddSalePaymentVoidAudit20261005000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE sale_payments
        ADD COLUMN IF NOT EXISTS voided_by_user_id uuid NULL;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE sale_payments
          ADD CONSTRAINT fk_sale_payments_voided_by_user
          FOREIGN KEY (voided_by_user_id) REFERENCES users(user_id) ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_sale_payments_status_voided_at
      ON sale_payments (status, voided_at DESC);
    `);
  }

  async down(): Promise<void> {}
}
