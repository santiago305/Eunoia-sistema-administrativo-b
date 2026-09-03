import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCompanyPrimaryColor20260903000000 implements MigrationInterface {
  name = "AddCompanyPrimaryColor20260903000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE companies
        ADD COLUMN IF NOT EXISTS primary_color varchar(7) NOT NULL DEFAULT '#21B5A6'
    `);

    await queryRunner.query(`
      ALTER TABLE companies
        DROP CONSTRAINT IF EXISTS chk_companies_primary_color,
        ADD CONSTRAINT chk_companies_primary_color
          CHECK (primary_color ~ '^#[0-9A-Fa-f]{6}$')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE companies
        DROP CONSTRAINT IF EXISTS chk_companies_primary_color,
        DROP COLUMN IF EXISTS primary_color
    `);
  }
}
