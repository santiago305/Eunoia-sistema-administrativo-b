import { MigrationInterface, QueryRunner } from "typeorm";

export class NormalizePaymentMethodCatalog20260920090000 implements MigrationInterface {
  name = "NormalizePaymentMethodCatalog20260920090000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE payment_methods
      ADD COLUMN IF NOT EXISTS code varchar(50),
      ADD COLUMN IF NOT EXISTS category varchar(40) NOT NULL DEFAULT 'OTHER',
      ADD COLUMN IF NOT EXISTS requires_source_account boolean NOT NULL DEFAULT true,
      ADD COLUMN IF NOT EXISTS requires_destination boolean NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS requires_operation_reference boolean NOT NULL DEFAULT true,
      ADD COLUMN IF NOT EXISTS is_system boolean NOT NULL DEFAULT false
    `);

    await queryRunner.query(`
      ALTER TABLE company_methods
      ADD COLUMN IF NOT EXISTS enabled boolean NOT NULL DEFAULT true,
      ADD COLUMN IF NOT EXISTS evidence_policy varchar(20) NOT NULL DEFAULT 'INHERIT'
    `);

    await queryRunner.query(`
      UPDATE payment_methods
      SET code = CASE UPPER(BTRIM(name))
        WHEN 'EFECTIVO' THEN 'CASH'
        WHEN 'CASH' THEN 'CASH'
        WHEN 'TRANSFERENCIA' THEN 'BANK_TRANSFER'
        WHEN 'TRANSFERENCIA BANCARIA' THEN 'BANK_TRANSFER'
        WHEN 'BANK_TRANSFER' THEN 'BANK_TRANSFER'
        WHEN 'DEPOSITO' THEN 'BANK_DEPOSIT'
        WHEN 'DEPÓSITO' THEN 'BANK_DEPOSIT'
        WHEN 'BANK_DEPOSIT' THEN 'BANK_DEPOSIT'
        WHEN 'TARJETA' THEN 'CARD'
        WHEN 'CARD' THEN 'CARD'
        WHEN 'YAPE' THEN 'DIGITAL_WALLET'
        WHEN 'PLIN' THEN 'DIGITAL_WALLET'
        WHEN 'BILLETERA' THEN 'DIGITAL_WALLET'
        WHEN 'BILLETERA DIGITAL' THEN 'DIGITAL_WALLET'
        WHEN 'DIGITAL_WALLET' THEN 'DIGITAL_WALLET'
        WHEN 'CHEQUE' THEN 'CHECK'
        WHEN 'CHECK' THEN 'CHECK'
        WHEN 'OTRO' THEN 'OTHER'
        WHEN 'OTHER' THEN 'OTHER'
        ELSE 'CUSTOM_' || LEFT(REGEXP_REPLACE(UPPER(BTRIM(name)), '[^A-Z0-9]+', '_', 'g'), 25)
          || '_' || RIGHT(REPLACE(method_id::text, '-', ''), 8)
      END
      WHERE code IS NULL
    `);

    await queryRunner.query(`
      UPDATE payment_methods
      SET category = CASE code
        WHEN 'CASH' THEN 'CASH'
        WHEN 'BANK_TRANSFER' THEN 'BANKING'
        WHEN 'BANK_DEPOSIT' THEN 'BANKING'
        WHEN 'CARD' THEN 'CARD'
        WHEN 'DIGITAL_WALLET' THEN 'DIGITAL_WALLET'
        WHEN 'CHECK' THEN 'CHECK'
        ELSE 'OTHER'
      END,
      requires_source_account = CASE WHEN code = 'CASH' THEN true ELSE true END,
      requires_destination = code IN ('BANK_TRANSFER', 'BANK_DEPOSIT', 'DIGITAL_WALLET', 'CHECK'),
      requires_operation_reference = code <> 'CASH',
      is_system = code IN ('CASH', 'BANK_TRANSFER', 'BANK_DEPOSIT', 'CARD', 'DIGITAL_WALLET', 'CHECK', 'OTHER'),
      requires_voucher = code <> 'CASH'
    `);

    await queryRunner.query(`
      UPDATE company_methods
      SET evidence_policy = CASE
        WHEN requires_voucher THEN 'REQUIRED'
        ELSE 'OPTIONAL'
      END
    `);

    await queryRunner.query(`
      CREATE TEMP TABLE payment_method_code_map AS
      SELECT
        pm.method_id,
        pm.code,
        canonical.canonical_method_id
      FROM payment_methods pm
      JOIN (
        SELECT DISTINCT ON (code)
          code,
          method_id AS canonical_method_id
        FROM payment_methods
        ORDER BY code, method_id
      ) canonical ON canonical.code = pm.code
    `);

    await queryRunner.query(`
      UPDATE company_methods cm
      SET method_id = map.canonical_method_id
      FROM payment_method_code_map map
      WHERE cm.method_id = map.method_id
        AND map.method_id <> map.canonical_method_id
        AND NOT EXISTS (
          SELECT 1
          FROM company_methods existing
          WHERE existing.company_id = cm.company_id
            AND existing.method_id = map.canonical_method_id
            AND COALESCE(BTRIM(existing.number), '') = COALESCE(BTRIM(cm.number), '')
        )
    `);
    await queryRunner.query(`
      UPDATE company_methods cm
      SET enabled = false
      FROM payment_method_code_map map
      WHERE cm.method_id = map.method_id
        AND map.method_id <> map.canonical_method_id
        AND EXISTS (
          SELECT 1
          FROM company_methods existing
          WHERE existing.company_id = cm.company_id
            AND existing.method_id = map.canonical_method_id
            AND COALESCE(BTRIM(existing.number), '') = COALESCE(BTRIM(cm.number), '')
        )
    `);
    await queryRunner.query(`
      UPDATE supplier_methods sm
      SET method_id = map.canonical_method_id
      FROM payment_method_code_map map
      WHERE sm.method_id = map.method_id
        AND map.method_id <> map.canonical_method_id
        AND NOT EXISTS (
          SELECT 1
          FROM supplier_methods existing
          WHERE existing.supplier_id = sm.supplier_id
            AND existing.method_id = map.canonical_method_id
            AND COALESCE(BTRIM(existing.number), '') = COALESCE(BTRIM(sm.number), '')
        )
    `);
    await queryRunner.query(`
      UPDATE payment_documents pd
      SET payment_method_id = map.canonical_method_id
      FROM payment_method_code_map map
      WHERE pd.payment_method_id = map.method_id
        AND map.method_id <> map.canonical_method_id
    `);
    await queryRunner.query(`
      UPDATE payment_methods pm
      SET code = 'LEGACY_' || map.code || '_' || RIGHT(REPLACE(pm.method_id::text, '-', ''), 8),
          is_active = false,
          is_system = false
      FROM payment_method_code_map map
      WHERE pm.method_id = map.method_id
        AND map.method_id <> map.canonical_method_id
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS payment_method_code_map`);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_payment_methods_code
      ON payment_methods (code)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_payment_methods_code
      ON payment_methods (code)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_company_methods_enabled
      ON company_methods (company_id, enabled)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_company_methods_enabled`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_payment_methods_code`);
    await queryRunner.query(`DROP INDEX IF EXISTS ux_payment_methods_code`);
    await queryRunner.query(`ALTER TABLE company_methods DROP COLUMN IF EXISTS evidence_policy`);
    await queryRunner.query(`ALTER TABLE company_methods DROP COLUMN IF EXISTS enabled`);
    await queryRunner.query(`
      ALTER TABLE payment_methods
      DROP COLUMN IF EXISTS is_system,
      DROP COLUMN IF EXISTS requires_operation_reference,
      DROP COLUMN IF EXISTS requires_destination,
      DROP COLUMN IF EXISTS requires_source_account,
      DROP COLUMN IF EXISTS category,
      DROP COLUMN IF EXISTS code
    `);
  }
}
