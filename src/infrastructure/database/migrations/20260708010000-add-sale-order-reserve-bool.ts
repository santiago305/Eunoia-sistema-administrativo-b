import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSaleOrderReserveBool20260708010000 implements MigrationInterface {
  name = "AddSaleOrderReserveBool20260708010000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE sale_orders
      ADD COLUMN IF NOT EXISTS reserve_bool boolean NOT NULL DEFAULT false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE sale_orders
      DROP COLUMN IF EXISTS reserve_bool
    `);
  }
}
