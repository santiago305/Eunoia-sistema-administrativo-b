import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSaleOrderAdvisersAndPhotos20260703000000
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS advisers (
        user_id uuid PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE
      );
      ALTER TABLE sale_orders
        ADD COLUMN IF NOT EXISTS send_date timestamptz NULL,
        ADD COLUMN IF NOT EXISTS send_photo varchar NULL,
        ADD COLUMN IF NOT EXISTS send_code varchar NULL,
        ADD COLUMN IF NOT EXISTS send_address varchar NULL,
        ADD COLUMN IF NOT EXISTS assigned_by uuid NULL;
      CREATE INDEX IF NOT EXISTS idx_sale_orders_assigned_by
        ON sale_orders (assigned_by);
      DO $$ BEGIN
        ALTER TABLE sale_orders ADD CONSTRAINT fk_sale_orders_assigned_by
          FOREIGN KEY (assigned_by) REFERENCES users(user_id) ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      ALTER TABLE sale_payments
        ADD COLUMN IF NOT EXISTS payment_photo varchar NULL;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE sale_payments DROP COLUMN IF EXISTS payment_photo;
      ALTER TABLE sale_orders DROP CONSTRAINT IF EXISTS fk_sale_orders_assigned_by;
      DROP INDEX IF EXISTS idx_sale_orders_assigned_by;
      ALTER TABLE sale_orders
        DROP COLUMN IF EXISTS assigned_by,
        DROP COLUMN IF EXISTS send_code,
        DROP COLUMN IF EXISTS send_address,
        DROP COLUMN IF EXISTS send_photo,
        DROP COLUMN IF EXISTS send_date;
      DROP TABLE IF EXISTS advisers;
    `);
  }
}
