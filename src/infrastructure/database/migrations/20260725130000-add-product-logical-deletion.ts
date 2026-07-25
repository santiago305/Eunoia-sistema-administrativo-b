import { MigrationInterface, QueryRunner } from "typeorm";

export class AddProductLogicalDeletion20260725130000 implements MigrationInterface {
  name = "AddProductLogicalDeletion20260725130000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE pc_products
      ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_pc_products_deleted
      ON pc_products (is_deleted);
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_pc_products_deleted;`);
    await queryRunner.query(`ALTER TABLE pc_products DROP COLUMN IF EXISTS is_deleted;`);
  }
}
