import { MigrationInterface, QueryRunner } from "typeorm";

export class RetireCompanyMethodNumber20260921190000 implements MigrationInterface {
  name = "RetireCompanyMethodNumber20260921190000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    const values = await queryRunner.query(`
      SELECT COUNT(*)::int AS count
      FROM company_methods
      WHERE NULLIF(BTRIM(number), '') IS NOT NULL
    `);
    if (Number(values?.[0]?.count ?? 0) > 0) {
      throw new Error("No se puede retirar company_methods.number: existen valores por conciliar.");
    }
    const duplicates = await queryRunner.query(`
      SELECT COUNT(*)::int AS count
      FROM (
        SELECT company_id, method_id
        FROM company_methods
        GROUP BY company_id, method_id
        HAVING COUNT(*) > 1
      ) duplicated
    `);
    if (Number(duplicates?.[0]?.count ?? 0) > 0) {
      throw new Error("No se puede retirar company_methods.number: existen relaciones duplicadas.");
    }

    await queryRunner.query(`DROP INDEX IF EXISTS ux_company_methods_owner_method_number`);
    await queryRunner.query(`ALTER TABLE company_methods DROP COLUMN IF EXISTS number`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_company_methods_owner_method
      ON company_methods (company_id, method_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS ux_company_methods_owner_method`);
    await queryRunner.query(`ALTER TABLE company_methods ADD COLUMN IF NOT EXISTS number varchar(30) NULL`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_company_methods_owner_method_number
      ON company_methods (company_id, method_id, COALESCE(BTRIM(number), ''))
    `);
  }
}
