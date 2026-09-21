import { MigrationInterface, QueryRunner } from "typeorm";

export class ReconcileLegacySupplierMethodDuplicates20260921130000 implements MigrationInterface {
  name = "ReconcileLegacySupplierMethodDuplicates20260921130000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      WITH duplicates AS (
        SELECT
          (array_agg(supplier_method_id ORDER BY supplier_method_id))[1] AS keep_id,
          supplier_id,
          method_id,
          COALESCE(BTRIM(number), '') AS relation_number
        FROM supplier_methods
        GROUP BY supplier_id, method_id, COALESCE(BTRIM(number), '')
        HAVING COUNT(*) > 1
      ), legacy_wallet AS (
        SELECT method_id
        FROM payment_methods
        WHERE code LIKE 'LEGACY_PROVIDER_%'
          AND name = 'Billetera digital (histórico)'
        ORDER BY method_id
        LIMIT 1
      )
      UPDATE supplier_methods duplicate
      SET method_id = legacy_wallet.method_id
      FROM duplicates, legacy_wallet
      WHERE duplicate.supplier_id = duplicates.supplier_id
        AND duplicate.method_id = duplicates.method_id
        AND COALESCE(BTRIM(duplicate.number), '') = duplicates.relation_number
        AND duplicate.supplier_method_id <> duplicates.keep_id
    `);
  }

  async down(): Promise<void> {
    // La reconciliación conserva los registros y no se revierte automáticamente.
  }
}
