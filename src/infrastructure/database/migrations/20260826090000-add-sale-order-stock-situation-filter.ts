import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSaleOrderStockSituationFilter20260826090000
  implements MigrationInterface
{
  name = "AddSaleOrderStockSituationFilter20260826090000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE sale_orders
      ADD COLUMN IF NOT EXISTS stock_reverted_bool boolean NOT NULL DEFAULT false
    `);

    await queryRunner.query(`
      UPDATE sale_orders sale_order
      SET stock_reverted_bool = true
      WHERE EXISTS (
        SELECT 1
        FROM pc_inventory_documents reversal_document
        WHERE reversal_document.reference_type = 'SALE_ORDER'
          AND reversal_document.reference_id = sale_order.id
          AND reversal_document.doc_type = 'IN'
          AND reversal_document.status = 'POSTED'
      ) OR EXISTS (
        SELECT 1
        FROM sale_order_state_history history
        LEFT JOIN workflow_actions action
          ON action.transition_id = history.transition_id
         AND action.branch = COALESCE(history.metadata ->> 'branch', 'THEN')
        WHERE history.sale_order_id = sale_order.id
          AND (
            action.type = 'REVERT_STOCK'
            OR history.metadata ->> 'stockStatus' = 'REVERTED'
            OR history.metadata ->> 'stockRestored' = 'true'
          )
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_sale_orders_stock_reverted
      ON sale_orders (stock_reverted_bool)
      WHERE stock_reverted_bool = true
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_pc_inventory_documents_sale_order_stock
      ON pc_inventory_documents (reference_type, reference_id, doc_type, status)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_pc_inventory_documents_sale_order_stock`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_sale_orders_stock_reverted`);
    await queryRunner.query(`ALTER TABLE sale_orders DROP COLUMN IF EXISTS stock_reverted_bool`);
  }
}
