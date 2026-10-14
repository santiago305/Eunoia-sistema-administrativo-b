import { MigrationInterface, QueryRunner } from "typeorm";

/** Keep batch-result recovery indexed by the client-visible idempotency key and owner scope. */
export class IndexFinancialIdempotencyResultLookup20261012020000 implements MigrationInterface {
  name = "IndexFinancialIdempotencyResultLookup20261012020000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_financial_idempotency_result_lookup
        ON financial_idempotency_records (idempotency_key, scope_key, created_at DESC);
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_financial_idempotency_result_lookup`);
  }
}
