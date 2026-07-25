import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Production uses the stock-item id in finished_item_id. The original
 * production migration accidentally referenced pc_skus.sku_id, which made
 * every production order containing an item fail with a foreign-key error.
 */
export class FixProductionItemStockReference20260725120000 implements MigrationInterface {
  name = "FixProductionItemStockReference20260725120000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE production_order_items
      DROP CONSTRAINT IF EXISTS production_order_items_finished_item_id_fkey;
    `);

    // Convert rows created by the old schema from SKU ids to stock-item ids
    // before installing the corrected foreign key.
    await queryRunner.query(`
      UPDATE production_order_items poi
      SET finished_item_id = stock.stock_item_id
      FROM pc_stock_items stock
      WHERE poi.finished_item_id = stock.sku_id;
    `);

    await queryRunner.query(`
      ALTER TABLE production_order_items
      ADD CONSTRAINT fk_production_order_items_finished_stock_item
      FOREIGN KEY (finished_item_id)
      REFERENCES pc_stock_items(stock_item_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE production_order_items
      DROP CONSTRAINT IF EXISTS fk_production_order_items_finished_stock_item;
    `);

    await queryRunner.query(`
      UPDATE production_order_items poi
      SET finished_item_id = stock.sku_id
      FROM pc_stock_items stock
      WHERE poi.finished_item_id = stock.stock_item_id;
    `);

    await queryRunner.query(`
      ALTER TABLE production_order_items
      ADD CONSTRAINT production_order_items_finished_item_id_fkey
      FOREIGN KEY (finished_item_id)
      REFERENCES pc_skus(sku_id);
    `);
  }
}
