import { MigrationInterface, QueryRunner } from "typeorm";

export class SaleOrdersWarehouseNullable20260530000000 implements MigrationInterface {
  name = "SaleOrdersWarehouseNullable20260530000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE sale_orders
      ALTER COLUMN warehouse_id DROP NOT NULL;
    `);
  }

  public async down(): Promise<void> {
    // No-op: reverting safely requires backfilling NULLs before restoring NOT NULL.
  }
}

