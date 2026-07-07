import { MigrationInterface, QueryRunner } from 'typeorm';

export class ReplaceSaleOrderAgencyDetail20260703010000
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE sale_orders ADD COLUMN IF NOT EXISTS agency_subsidiary_id uuid NULL;
      UPDATE sale_orders
      SET send_address = COALESCE(send_address, agency_detail)
      WHERE agency_detail IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_sale_orders_agency_subsidiary_id
        ON sale_orders (agency_subsidiary_id);
      DO $$ BEGIN
        ALTER TABLE sale_orders
          ADD CONSTRAINT fk_sale_orders_agency_subsidiary
          FOREIGN KEY (agency_subsidiary_id) REFERENCES subsidiaries(id)
          ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      ALTER TABLE sale_orders DROP COLUMN IF EXISTS agency_detail;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE sale_orders ADD COLUMN IF NOT EXISTS agency_detail text NULL;
      UPDATE sale_orders
      SET agency_detail = COALESCE(agency_detail, send_address)
      WHERE send_address IS NOT NULL;
      ALTER TABLE sale_orders DROP CONSTRAINT IF EXISTS fk_sale_orders_agency_subsidiary;
      DROP INDEX IF EXISTS idx_sale_orders_agency_subsidiary_id;
      ALTER TABLE sale_orders DROP COLUMN IF EXISTS agency_subsidiary_id;
    `);
  }
}
