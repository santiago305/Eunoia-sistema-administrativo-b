import { MigrationInterface, QueryRunner } from "typeorm";

export class AddListingIndexes20260412000000 implements MigrationInterface {
  name = "AddListingIndexes20260412000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_suppliers_active_created_at
      ON suppliers (is_active, created_at DESC)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_warehouses_active_created_at
      ON warehouses (is_active, created_at DESC)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_locations_warehouse_active
      ON warehouse_locations (warehouse_id, is_active)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_locations_warehouse_active`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_warehouses_active_created_at`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_suppliers_active_created_at`);
  }
}
