import { MigrationInterface, QueryRunner } from 'typeorm';

export class RestoreSaleOrderAgencyDetail20260708000000
  implements MigrationInterface
{
  name = 'RestoreSaleOrderAgencyDetail20260708000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE sale_orders ADD COLUMN IF NOT EXISTS agency_detail text NULL;
      UPDATE sale_orders
      SET agency_detail = COALESCE(agency_detail, send_address)
      WHERE agency_detail IS NULL
        AND send_address IS NOT NULL;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE sale_orders DROP COLUMN IF EXISTS agency_detail;
    `);
  }
}
