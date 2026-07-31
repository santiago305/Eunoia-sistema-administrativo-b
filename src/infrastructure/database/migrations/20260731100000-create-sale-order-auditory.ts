import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateSaleOrderAuditory20260731100000 implements MigrationInterface {
  name = "CreateSaleOrderAuditory20260731100000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS sale_order_auditory (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        sale_order_id uuid NOT NULL REFERENCES sale_orders(id) ON DELETE CASCADE,
        created_at timestamptz NOT NULL DEFAULT timezone('America/Lima', CURRENT_TIMESTAMP),
        executed_by uuid NOT NULL REFERENCES users(user_id),
        action_execution varchar(20) NOT NULL,
        CONSTRAINT chk_sale_order_auditory_action CHECK (action_execution IN ('delete', 'restore'))
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_sale_order_auditory_order_created
      ON sale_order_auditory (sale_order_id, created_at DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_sale_order_auditory_order_created`);
    await queryRunner.query(`DROP TABLE IF EXISTS sale_order_auditory`);
  }
}
