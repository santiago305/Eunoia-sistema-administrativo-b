import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPreferredCompanyPaymentMethod20260928120000
  implements MigrationInterface
{
  name = "AddPreferredCompanyPaymentMethod20260928120000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE company_methods
      ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false
    `);

    await queryRunner.query(`
      UPDATE payment_methods
      SET code = 'BANK_TRANSFER'
      WHERE code <> 'BANK_TRANSFER'
        AND UPPER(BTRIM(name)) IN ('TRANSFERENCIA', 'TRANSFERENCIA BANCARIA')
        AND NOT EXISTS (
          SELECT 1 FROM payment_methods canonical
          WHERE canonical.code = 'BANK_TRANSFER'
        )
    `);

    await queryRunner.query(`
      INSERT INTO payment_methods (
        method_id,
        name,
        description,
        requires_voucher,
        is_active,
        code,
        category,
        requires_source_account,
        requires_destination,
        requires_operation_reference,
        is_system
      )
      SELECT
        uuid_generate_v4(),
        'Transferencia bancaria',
        'Transferencia entre cuentas bancarias',
        true,
        true,
        'BANK_TRANSFER',
        'BANKING',
        true,
        true,
        true,
        true
      WHERE NOT EXISTS (
        SELECT 1 FROM payment_methods WHERE code = 'BANK_TRANSFER'
      )
    `);

    await queryRunner.query(`
      UPDATE payment_methods
      SET name = 'Transferencia bancaria',
          category = 'BANKING',
          is_active = true,
          requires_voucher = true,
          requires_source_account = true,
          requires_destination = true,
          requires_operation_reference = true,
          is_system = true,
          updated_at = now()
      WHERE code = 'BANK_TRANSFER'
    `);

    await queryRunner.query(`
      INSERT INTO company_methods (
        company_method_id,
        company_id,
        method_id,
        enabled,
        evidence_policy,
        is_default
      )
      SELECT
        uuid_generate_v4(),
        company.company_id,
        method.method_id,
        true,
        'INHERIT',
        false
      FROM companies company
      CROSS JOIN payment_methods method
      WHERE method.code = 'BANK_TRANSFER'
        AND NOT EXISTS (
          SELECT 1
          FROM company_methods configured
          WHERE configured.company_id = company.company_id
            AND configured.method_id = method.method_id
        )
    `);

    await queryRunner.query(`
      UPDATE company_methods
      SET is_default = false
    `);
    await queryRunner.query(`
      UPDATE company_methods configured
      SET enabled = true,
          is_default = true
      FROM payment_methods method
      WHERE configured.method_id = method.method_id
        AND method.code = 'BANK_TRANSFER'
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_company_methods_default_company
      ON company_methods (company_id)
      WHERE is_default = true
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE company_methods
        ADD CONSTRAINT chk_company_methods_default_enabled
        CHECK (NOT is_default OR enabled);
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION ensure_company_bank_transfer_method()
      RETURNS trigger AS $$
      BEGIN
        INSERT INTO company_methods (
          company_method_id,
          company_id,
          method_id,
          enabled,
          evidence_policy,
          is_default
        )
        SELECT
          uuid_generate_v4(),
          NEW.company_id,
          method.method_id,
          true,
          'INHERIT',
          true
        FROM payment_methods method
        WHERE method.code = 'BANK_TRANSFER'
        ON CONFLICT (company_id, method_id)
        DO UPDATE SET enabled = true;

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trg_ensure_company_bank_transfer_method ON companies;
      CREATE TRIGGER trg_ensure_company_bank_transfer_method
      AFTER INSERT ON companies
      FOR EACH ROW
      EXECUTE FUNCTION ensure_company_bank_transfer_method()
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION protect_company_bank_transfer_method()
      RETURNS trigger AS $$
      DECLARE
        old_method_code varchar(50);
      BEGIN
        SELECT code INTO old_method_code
        FROM payment_methods
        WHERE method_id = OLD.method_id;

        IF old_method_code = 'BANK_TRANSFER' THEN
          IF TG_OP = 'DELETE' THEN
            RAISE EXCEPTION 'Transferencia bancaria es un método obligatorio y no puede desvincularse';
          ELSIF NEW.method_id IS DISTINCT FROM OLD.method_id OR NEW.enabled = false THEN
            RAISE EXCEPTION 'Transferencia bancaria es un método obligatorio y no puede desvincularse';
          END IF;
        END IF;

        IF TG_OP = 'DELETE' THEN
          RETURN OLD;
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trg_protect_company_bank_transfer_method ON company_methods;
      CREATE TRIGGER trg_protect_company_bank_transfer_method
      BEFORE UPDATE OR DELETE ON company_methods
      FOR EACH ROW
      EXECUTE FUNCTION protect_company_bank_transfer_method()
    `);

    await queryRunner.query(`
      UPDATE sale_payments payment
      SET payment_method_id = method.method_id,
          method = method.name,
          company_payment_account_id = NULL
      FROM payment_methods method
      WHERE method.code = 'BANK_TRANSFER'
        AND LOWER(REGEXP_REPLACE(BTRIM(payment.method), '[^a-z0-9]+', '_', 'g'))
          IN ('import_adelanto', 'importe_adelanto', 'impor_adelanto', 'improt_adelanto')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_protect_company_bank_transfer_method ON company_methods`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS protect_company_bank_transfer_method()`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_ensure_company_bank_transfer_method ON companies`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS ensure_company_bank_transfer_method()`);
    await queryRunner.query(`ALTER TABLE company_methods DROP CONSTRAINT IF EXISTS chk_company_methods_default_enabled`);
    await queryRunner.query(`DROP INDEX IF EXISTS ux_company_methods_default_company`);
    await queryRunner.query(`ALTER TABLE company_methods DROP COLUMN IF EXISTS is_default`);
  }
}
