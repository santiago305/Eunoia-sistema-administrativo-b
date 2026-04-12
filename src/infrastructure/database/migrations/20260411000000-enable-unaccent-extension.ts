import { MigrationInterface, QueryRunner } from "typeorm";

export class EnableUnaccentExtension20260411000000 implements MigrationInterface {
  name = "EnableUnaccentExtension20260411000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS unaccent`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP EXTENSION IF EXISTS unaccent`);
  }
}
