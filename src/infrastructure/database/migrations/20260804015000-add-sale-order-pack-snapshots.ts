import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSaleOrderPackSnapshots20260804015000 implements MigrationInterface {
  name = "AddSaleOrderPackSnapshots20260804015000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE sale_order_items
      ADD COLUMN IF NOT EXISTS pack_name_snapshot varchar(255);

      ALTER TABLE sale_order_item_components
      ADD COLUMN IF NOT EXISTS sku_name_snapshot varchar(180),
      ADD COLUMN IF NOT EXISTS backend_sku_snapshot varchar(80),
      ADD COLUMN IF NOT EXISTS custom_sku_snapshot varchar(80),
      ADD COLUMN IF NOT EXISTS barcode_snapshot varchar(80),
      ADD COLUMN IF NOT EXISTS image_snapshot text,
      ADD COLUMN IF NOT EXISTS product_id_snapshot uuid,
      ADD COLUMN IF NOT EXISTS attributes_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb;

      UPDATE sale_order_items item
      SET pack_name_snapshot = pack.description
      FROM packs pack
      WHERE item.reference_pack_id = pack.id
        AND item.pack_name_snapshot IS NULL;

      UPDATE sale_order_item_components component
      SET
        sku_name_snapshot = sku.name,
        backend_sku_snapshot = sku.backend_sku,
        custom_sku_snapshot = sku.custom_sku,
        barcode_snapshot = sku.barcode,
        image_snapshot = sku.image,
        product_id_snapshot = sku.product_id
      FROM pc_skus sku
      WHERE component.sku_id = sku.sku_id
        AND component.sku_name_snapshot IS NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE sale_order_item_components
      DROP COLUMN IF EXISTS attributes_snapshot,
      DROP COLUMN IF EXISTS product_id_snapshot,
      DROP COLUMN IF EXISTS image_snapshot,
      DROP COLUMN IF EXISTS barcode_snapshot,
      DROP COLUMN IF EXISTS custom_sku_snapshot,
      DROP COLUMN IF EXISTS backend_sku_snapshot,
      DROP COLUMN IF EXISTS sku_name_snapshot;

      ALTER TABLE sale_order_items
      DROP COLUMN IF EXISTS pack_name_snapshot;
    `);
  }
}
