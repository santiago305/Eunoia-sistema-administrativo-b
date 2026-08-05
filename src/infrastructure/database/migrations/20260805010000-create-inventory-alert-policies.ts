import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateInventoryAlertPolicies20260805010000 implements MigrationInterface {
  name = "CreateInventoryAlertPolicies20260805010000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "pc_inventory_alert_policies" (
        "product_type" pc_product_type NOT NULL,
        "history_days" integer NOT NULL DEFAULT 3,
        "coverage_days" integer NOT NULL DEFAULT 3,
        "alert_enabled" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_pc_inventory_alert_policies" PRIMARY KEY ("product_type"),
        CONSTRAINT "chk_pc_inventory_alert_policies_history" CHECK ("history_days" > 0),
        CONSTRAINT "chk_pc_inventory_alert_policies_coverage" CHECK ("coverage_days" > 0)
      )
    `);
    await queryRunner.query(`
      INSERT INTO "pc_inventory_alert_policies" ("product_type")
      VALUES ('PRODUCT'), ('MATERIAL')
      ON CONFLICT ("product_type") DO NOTHING
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "pc_inventory_alert_policies"`);
  }
}
