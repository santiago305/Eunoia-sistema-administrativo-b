import { MigrationInterface, QueryRunner } from "typeorm";

export class AddProductionDefaultWarehouse20260805020000 implements MigrationInterface {
  name = "AddProductionDefaultWarehouse20260805020000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS is_production_default boolean NOT NULL DEFAULT false`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS ux_warehouses_production_default ON warehouses (is_production_default) WHERE is_production_default = true`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS ux_warehouses_production_default`);
    await queryRunner.query(`ALTER TABLE warehouses DROP COLUMN IF EXISTS is_production_default`);
  }
}
