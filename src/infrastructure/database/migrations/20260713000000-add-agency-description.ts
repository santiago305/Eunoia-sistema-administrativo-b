import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAgencyDescription20260713000000 implements MigrationInterface {
  name = "AddAgencyDescription20260713000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE agencies
      ADD COLUMN IF NOT EXISTS description varchar(500)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE agencies
      DROP COLUMN IF EXISTS description
    `);
  }
}
