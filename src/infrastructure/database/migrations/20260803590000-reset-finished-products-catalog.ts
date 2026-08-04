import { MigrationInterface, QueryRunner } from "typeorm";

export class ResetFinishedProductsCatalog20260803590000
  implements MigrationInterface
{
  name = "ResetFinishedProductsCatalog20260803590000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      DECLARE
        sale_component_references bigint;
        sale_pack_references bigint;
        production_references bigint;
        inventory_document_references bigint;
        inventory_ledger_references bigint;
        purchase_references bigint;
      BEGIN
        SELECT count(*)
        INTO sale_component_references
        FROM sale_order_item_components component
        JOIN pc_skus sku ON sku.sku_id = component.sku_id
        JOIN pc_products product ON product.product_id = sku.product_id
        WHERE product.type = 'PRODUCT';

        SELECT count(*)
        INTO sale_pack_references
        FROM sale_order_items sale_item
        WHERE sale_item.reference_pack_id IN (
          SELECT DISTINCT pack_item.pack_id
          FROM pack_items pack_item
          JOIN pc_skus sku ON sku.sku_id = pack_item.sku_id
          JOIN pc_products product ON product.product_id = sku.product_id
          WHERE product.type = 'PRODUCT'
        );

        SELECT count(*)
        INTO production_references
        FROM production_order_items production_item
        JOIN pc_stock_items stock ON stock.stock_item_id = production_item.finished_item_id
        JOIN pc_skus sku ON sku.sku_id = stock.sku_id
        JOIN pc_products product ON product.product_id = sku.product_id
        WHERE product.type = 'PRODUCT';

        SELECT count(*)
        INTO inventory_document_references
        FROM pc_inventory_document_items document_item
        JOIN pc_stock_items stock ON stock.stock_item_id = document_item.stock_item_id
        JOIN pc_skus sku ON sku.sku_id = stock.sku_id
        JOIN pc_products product ON product.product_id = sku.product_id
        WHERE product.type = 'PRODUCT';

        SELECT count(*)
        INTO inventory_ledger_references
        FROM pc_inventory_ledger ledger
        JOIN pc_stock_items stock ON stock.stock_item_id = ledger.stock_item_id
        JOIN pc_skus sku ON sku.sku_id = stock.sku_id
        JOIN pc_products product ON product.product_id = sku.product_id
        WHERE product.type = 'PRODUCT';

        SELECT count(*)
        INTO purchase_references
        FROM purchase_order_items purchase_item
        JOIN pc_stock_items stock ON stock.stock_item_id = purchase_item.stock_item_id
        JOIN pc_skus sku ON sku.sku_id = stock.sku_id
        JOIN pc_products product ON product.product_id = sku.product_id
        WHERE product.type = 'PRODUCT';

        IF sale_component_references > 0
          OR sale_pack_references > 0
          OR production_references > 0
          OR inventory_document_references > 0
          OR inventory_ledger_references > 0
          OR purchase_references > 0 THEN
          RAISE EXCEPTION
            'Finished product catalog reset blocked: sale components=%, sale pack references=%, production items=%, inventory document items=%, inventory ledger=%, purchase items=%',
            sale_component_references,
            sale_pack_references,
            production_references,
            inventory_document_references,
            inventory_ledger_references,
            purchase_references;
        END IF;
      END $$;

      DELETE FROM packs pack
      WHERE EXISTS (
        SELECT 1
        FROM pack_items pack_item
        JOIN pc_skus sku ON sku.sku_id = pack_item.sku_id
        JOIN pc_products product ON product.product_id = sku.product_id
        WHERE product.type = 'PRODUCT'
          AND pack_item.pack_id = pack.id
      );

      DELETE FROM pc_recipes recipe
      WHERE EXISTS (
        SELECT 1
        FROM pc_recipe_items recipe_item
        JOIN pc_skus sku ON sku.sku_id = recipe_item.material_sku_id
        JOIN pc_products product ON product.product_id = sku.product_id
        WHERE product.type = 'PRODUCT'
          AND recipe_item.recipe_id = recipe.recipe_id
      );

      DELETE FROM pc_products
      WHERE type = 'PRODUCT';
    `);
  }

  public async down(): Promise<void> {
    // Destructive one-time catalog reset. Deleted business data cannot be recreated.
  }
}
