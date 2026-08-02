import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Repairs tracked SKUs created without their required stock-item identity.
 * This is intentionally forward-only because repaired rows may become
 * referenced by inventory and production records after deployment.
 */
export class BackfillSkuStockItems20260801000000 implements MigrationInterface {
  name = "BackfillSkuStockItems20260801000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO pc_stock_items (sku_id, is_active)
      SELECT s.sku_id, s.is_active
      FROM pc_skus s
      WHERE s.is_stock_tracked = true
        AND NOT EXISTS (
          SELECT 1
          FROM pc_stock_items si
          WHERE si.sku_id = s.sku_id
        )
      ON CONFLICT (sku_id) DO NOTHING;
    `);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Forward-only data repair: deleting stock items after use would be unsafe.
  }
}
