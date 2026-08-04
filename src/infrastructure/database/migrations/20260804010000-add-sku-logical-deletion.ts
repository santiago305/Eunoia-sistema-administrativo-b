import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSkuLogicalDeletion20260804010000 implements MigrationInterface {
  name = "AddSkuLogicalDeletion20260804010000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE pc_skus
      ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false;

      CREATE INDEX IF NOT EXISTS idx_pc_skus_product_not_deleted
      ON pc_skus (product_id)
      WHERE is_deleted = false;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_pc_skus_product_not_deleted;

      ALTER TABLE pc_skus
      DROP COLUMN IF EXISTS is_deleted;
    `);
  }
}
