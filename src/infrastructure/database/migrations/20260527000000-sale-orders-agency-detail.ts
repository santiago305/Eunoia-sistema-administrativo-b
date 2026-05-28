import { MigrationInterface, QueryRunner } from "typeorm";

export class SaleOrdersAgencyDetail20260527000000 implements MigrationInterface {
  name = "SaleOrdersAgencyDetail20260527000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_sale_orders_agency_id;`);

    await queryRunner.query(`
      ALTER TABLE sale_orders
        DROP COLUMN IF EXISTS agency_id,
        ADD COLUMN IF NOT EXISTS agency_detail text NULL;
    `);
  }

  public async down(): Promise<void> {
    // No-op: migracion idempotente, no debe eliminar data.
  }
}

