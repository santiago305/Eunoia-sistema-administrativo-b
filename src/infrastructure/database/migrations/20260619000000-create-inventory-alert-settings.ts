import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateInventoryAlertSettings20260619000000 implements MigrationInterface {
  name = "CreateInventoryAlertSettings20260619000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "pc_inventory_alert_settings" (
        "setting_id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "stock_item_id" uuid NOT NULL,
        "warehouse_id" uuid,
        "min_stock_alert_qty" integer,
        "alert_threshold_days" double precision NOT NULL DEFAULT 3,
        "alert_enabled" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_pc_inventory_alert_settings" PRIMARY KEY ("setting_id"),
        CONSTRAINT "fk_pc_inventory_alert_settings_stock_item"
          FOREIGN KEY ("stock_item_id") REFERENCES "pc_stock_items"("stock_item_id") ON DELETE CASCADE,
        CONSTRAINT "fk_pc_inventory_alert_settings_warehouse"
          FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE CASCADE,
        CONSTRAINT "chk_pc_inventory_alert_settings_min_stock"
          CHECK ("min_stock_alert_qty" IS NULL OR "min_stock_alert_qty" >= 0),
        CONSTRAINT "chk_pc_inventory_alert_settings_threshold_days"
          CHECK ("alert_threshold_days" > 0)
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "ux_pc_inventory_alert_settings_global"
      ON "pc_inventory_alert_settings" ("stock_item_id")
      WHERE "warehouse_id" IS NULL
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "ux_pc_inventory_alert_settings_warehouse"
      ON "pc_inventory_alert_settings" ("stock_item_id", "warehouse_id")
      WHERE "warehouse_id" IS NOT NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "ux_pc_inventory_alert_settings_warehouse"`);
    await queryRunner.query(`DROP INDEX "ux_pc_inventory_alert_settings_global"`);
    await queryRunner.query(`DROP TABLE "pc_inventory_alert_settings"`);
  }
}
