import { MigrationInterface, QueryRunner } from "typeorm";

export class AlignCompaniesCurrentSchema20260716092000 implements MigrationInterface {
  name = "AlignCompaniesCurrentSchema20260716092000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE companies
        ADD COLUMN IF NOT EXISTS ubigeo varchar(6),
        ADD COLUMN IF NOT EXISTS department varchar(100),
        ADD COLUMN IF NOT EXISTS province varchar(100),
        ADD COLUMN IF NOT EXISTS district varchar(100),
        ADD COLUMN IF NOT EXISTS urbanization varchar(150),
        ADD COLUMN IF NOT EXISTS cod_local varchar(50),
        ADD COLUMN IF NOT EXISTS sol_user varchar(100),
        ADD COLUMN IF NOT EXISTS sol_pass varchar(255),
        ADD COLUMN IF NOT EXISTS logo_path varchar(255),
        ADD COLUMN IF NOT EXISTS isotype_path varchar(255),
        ADD COLUMN IF NOT EXISTS cert_path varchar(255),
        ADD COLUMN IF NOT EXISTS production boolean NOT NULL DEFAULT true
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'companies' AND column_name = 'logo_url'
        ) THEN
          UPDATE companies SET logo_path = COALESCE(logo_path, logo_url);
        END IF;

        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'companies' AND column_name = 'isotype_url'
        ) THEN
          UPDATE companies SET isotype_path = COALESCE(isotype_path, isotype_url);
        END IF;

        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'companies' AND column_name = 'certificate_url'
        ) THEN
          UPDATE companies SET cert_path = COALESCE(cert_path, certificate_url);
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE companies
        DROP COLUMN IF EXISTS production,
        DROP COLUMN IF EXISTS cert_path,
        DROP COLUMN IF EXISTS isotype_path,
        DROP COLUMN IF EXISTS logo_path,
        DROP COLUMN IF EXISTS sol_pass,
        DROP COLUMN IF EXISTS sol_user,
        DROP COLUMN IF EXISTS cod_local,
        DROP COLUMN IF EXISTS urbanization,
        DROP COLUMN IF EXISTS district,
        DROP COLUMN IF EXISTS province,
        DROP COLUMN IF EXISTS department,
        DROP COLUMN IF EXISTS ubigeo
    `);
  }
}
