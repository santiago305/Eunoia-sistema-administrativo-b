import { MigrationInterface, QueryRunner } from "typeorm";

export class ExpandPaymentMethodRelations20260414000000 implements MigrationInterface {
  name = "ExpandPaymentMethodRelations20260414000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE supplier_methods
      ADD COLUMN IF NOT EXISTS supplier_method_id uuid
    `);
    await queryRunner.query(`
      UPDATE supplier_methods
      SET supplier_method_id = uuid_generate_v4()
      WHERE supplier_method_id IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE supplier_methods
      ALTER COLUMN supplier_method_id SET DEFAULT uuid_generate_v4()
    `);
    await queryRunner.query(`
      ALTER TABLE supplier_methods
      ALTER COLUMN supplier_method_id SET NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE supplier_methods
      DROP CONSTRAINT IF EXISTS supplier_methods_pkey
    `);
    await queryRunner.query(`
      ALTER TABLE supplier_methods
      ADD CONSTRAINT supplier_methods_pkey PRIMARY KEY (supplier_method_id)
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_supplier_methods_owner_method_number
      ON supplier_methods (supplier_id, method_id, COALESCE(BTRIM(number), ''))
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_supplier_methods_supplier_id
      ON supplier_methods (supplier_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_supplier_methods_method_id
      ON supplier_methods (method_id)
    `);

    await queryRunner.query(`
      ALTER TABLE company_methods
      ADD COLUMN IF NOT EXISTS company_method_id uuid
    `);
    await queryRunner.query(`
      UPDATE company_methods
      SET company_method_id = uuid_generate_v4()
      WHERE company_method_id IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE company_methods
      ALTER COLUMN company_method_id SET DEFAULT uuid_generate_v4()
    `);
    await queryRunner.query(`
      ALTER TABLE company_methods
      ALTER COLUMN company_method_id SET NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE company_methods
      DROP CONSTRAINT IF EXISTS company_methods_pkey
    `);
    await queryRunner.query(`
      ALTER TABLE company_methods
      ADD CONSTRAINT company_methods_pkey PRIMARY KEY (company_method_id)
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_company_methods_owner_method_number
      ON company_methods (company_id, method_id, COALESCE(BTRIM(number), ''))
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_company_methods_company_id
      ON company_methods (company_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_company_methods_method_id
      ON company_methods (method_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const supplierDuplicates = await queryRunner.query(`
      SELECT COUNT(*)::int AS total
      FROM (
        SELECT supplier_id, method_id
        FROM supplier_methods
        GROUP BY supplier_id, method_id
        HAVING COUNT(*) > 1
      ) duplicated
    `);
    if (Number(supplierDuplicates[0]?.total ?? 0) > 0) {
      throw new Error("No se puede revertir supplier_methods: existen multiples relaciones por supplier_id y method_id.");
    }

    const companyDuplicates = await queryRunner.query(`
      SELECT COUNT(*)::int AS total
      FROM (
        SELECT company_id, method_id
        FROM company_methods
        GROUP BY company_id, method_id
        HAVING COUNT(*) > 1
      ) duplicated
    `);
    if (Number(companyDuplicates[0]?.total ?? 0) > 0) {
      throw new Error("No se puede revertir company_methods: existen multiples relaciones por company_id y method_id.");
    }

    await queryRunner.query(`DROP INDEX IF EXISTS idx_company_methods_method_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_company_methods_company_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS ux_company_methods_owner_method_number`);
    await queryRunner.query(`
      ALTER TABLE company_methods
      DROP CONSTRAINT IF EXISTS company_methods_pkey
    `);
    await queryRunner.query(`
      ALTER TABLE company_methods
      ADD CONSTRAINT company_methods_pkey PRIMARY KEY (company_id, method_id)
    `);
    await queryRunner.query(`
      ALTER TABLE company_methods
      DROP COLUMN IF EXISTS company_method_id
    `);

    await queryRunner.query(`DROP INDEX IF EXISTS idx_supplier_methods_method_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_supplier_methods_supplier_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS ux_supplier_methods_owner_method_number`);
    await queryRunner.query(`
      ALTER TABLE supplier_methods
      DROP CONSTRAINT IF EXISTS supplier_methods_pkey
    `);
    await queryRunner.query(`
      ALTER TABLE supplier_methods
      ADD CONSTRAINT supplier_methods_pkey PRIMARY KEY (supplier_id, method_id)
    `);
    await queryRunner.query(`
      ALTER TABLE supplier_methods
      DROP COLUMN IF EXISTS supplier_method_id
    `);
  }
}
