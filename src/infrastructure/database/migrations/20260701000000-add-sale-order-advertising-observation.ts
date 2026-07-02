import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSaleOrderAdvertisingObservation20260701000000
  implements MigrationInterface
{
  name = "AddSaleOrderAdvertisingObservation20260701000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE sale_orders
        ADD COLUMN IF NOT EXISTS advertising_code text NULL,
        ADD COLUMN IF NOT EXISTS observation text NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE sale_orders
        DROP COLUMN IF EXISTS observation,
        DROP COLUMN IF EXISTS advertising_code
    `);
  }
}
