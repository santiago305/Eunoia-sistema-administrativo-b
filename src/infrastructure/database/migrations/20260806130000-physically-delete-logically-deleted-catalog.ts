import { MigrationInterface, QueryRunner } from 'typeorm';

export class PhysicallyDeleteLogicallyDeletedCatalog20260806130000
  implements MigrationInterface
{
  name = 'PhysicallyDeleteLogicallyDeletedCatalog20260806130000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TEMP TABLE cleanup_target_skus ON COMMIT DROP AS
      SELECT sku.sku_id
      FROM pc_skus sku
      JOIN pc_products product ON product.product_id = sku.product_id
      WHERE sku.is_deleted = true
         OR product.is_deleted = true;

      CREATE UNIQUE INDEX ON cleanup_target_skus (sku_id);

      CREATE TEMP TABLE cleanup_target_stock_items ON COMMIT DROP AS
      SELECT stock.stock_item_id
      FROM pc_stock_items stock
      JOIN cleanup_target_skus target ON target.sku_id = stock.sku_id;

      CREATE UNIQUE INDEX ON cleanup_target_stock_items (stock_item_id);

      CREATE TEMP TABLE cleanup_target_purchases ON COMMIT DROP AS
      SELECT DISTINCT item.po_id
      FROM purchase_order_items item
      JOIN cleanup_target_stock_items target
        ON target.stock_item_id = item.stock_item_id;

      CREATE UNIQUE INDEX ON cleanup_target_purchases (po_id);

      CREATE TEMP TABLE cleanup_target_payments ON COMMIT DROP AS
      SELECT payment.pay_doc_id
      FROM payment_documents payment
      JOIN cleanup_target_purchases target ON target.po_id = payment.po_id;

      CREATE UNIQUE INDEX ON cleanup_target_payments (pay_doc_id);

      CREATE TEMP TABLE cleanup_target_quotas ON COMMIT DROP AS
      SELECT quota.quota_id
      FROM credit_quotas quota
      JOIN cleanup_target_purchases target ON target.po_id = quota.po_id;

      CREATE UNIQUE INDEX ON cleanup_target_quotas (quota_id);

      CREATE TEMP TABLE cleanup_target_productions ON COMMIT DROP AS
      SELECT DISTINCT item.production_id
      FROM production_order_items item
      JOIN cleanup_target_stock_items target
        ON target.stock_item_id = item.finished_item_id;

      CREATE UNIQUE INDEX ON cleanup_target_productions (production_id);

      DELETE FROM purchase_processing_approvals approval
      USING cleanup_target_purchases target
      WHERE approval.purchase_id = target.po_id;

      DELETE FROM purchase_history_events event
      USING cleanup_target_purchases target
      WHERE event.purchase_id = target.po_id;

      DELETE FROM approval_requests request
      USING cleanup_target_purchases target
      WHERE request.entity_id = target.po_id
        AND lower(request.entity_type) IN ('purchase', 'purchase_order');

      DELETE FROM purchase_orders purchase
      USING cleanup_target_purchases target
      WHERE purchase.po_id = target.po_id;

      DELETE FROM payment_documents payment
      USING cleanup_target_payments target
      WHERE payment.pay_doc_id = target.pay_doc_id;

      DELETE FROM credit_quotas quota
      USING cleanup_target_quotas target
      WHERE quota.quota_id = target.quota_id;

      DELETE FROM production_orders production
      USING cleanup_target_productions target
      WHERE production.production_id = target.production_id;

      DELETE FROM pc_inventory_ledger ledger
      USING cleanup_target_stock_items target
      WHERE ledger.stock_item_id = target.stock_item_id;

      DELETE FROM pc_inventory_document_items item
      USING cleanup_target_stock_items target
      WHERE item.stock_item_id = target.stock_item_id;

      DELETE FROM sale_order_item_components component
      USING cleanup_target_skus target
      WHERE component.sku_id = target.sku_id;

      DELETE FROM packs pack
      WHERE EXISTS (
        SELECT 1
        FROM pack_items item
        JOIN cleanup_target_skus target ON target.sku_id = item.sku_id
        WHERE item.pack_id = pack.id
      );

      DELETE FROM pc_recipes recipe
      WHERE recipe.sku_id IN (SELECT sku_id FROM cleanup_target_skus)
         OR EXISTS (
           SELECT 1
           FROM pc_recipe_items item
           JOIN cleanup_target_skus target
             ON target.sku_id = item.material_sku_id
           WHERE item.recipe_id = recipe.recipe_id
         );

      DELETE FROM pc_skus sku
      USING cleanup_target_skus target
      WHERE sku.sku_id = target.sku_id;

      DELETE FROM pc_products product
      WHERE product.is_deleted = true;
    `);
  }

  public async down(): Promise<void> {
    // La limpieza fisica de datos de prueba no se puede revertir.
  }
}
