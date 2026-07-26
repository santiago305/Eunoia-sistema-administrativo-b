import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSaleOrderPreparedPreguide20260725000000
  implements MigrationInterface
{
  name = 'AddSaleOrderPreparedPreguide20260725000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE sale_orders ADD COLUMN IF NOT EXISTS prepared boolean DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE sale_orders ADD COLUMN IF NOT EXISTS preguide boolean DEFAULT false`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE sale_orders DROP COLUMN IF EXISTS preguide`,
    );
    await queryRunner.query(
      `ALTER TABLE sale_orders DROP COLUMN IF EXISTS prepared`,
    );
  }
}
