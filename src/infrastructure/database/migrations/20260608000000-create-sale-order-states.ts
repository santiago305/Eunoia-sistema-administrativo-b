import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateSaleOrderStates20260608000000 implements MigrationInterface {
  name = "CreateSaleOrderStates20260608000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS sale_order_states (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        code varchar(100) NOT NULL UNIQUE,
        name varchar(120) NOT NULL,
        color varchar(50) NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_sale_order_states_name ON sale_order_states (name)`);
    await queryRunner.query(`
      ALTER TABLE workflow_states
      ADD COLUMN sale_order_state_id uuid NOT NULL REFERENCES sale_order_states(id) ON DELETE RESTRICT
    `);
    await queryRunner.query(`ALTER TABLE workflow_states DROP CONSTRAINT IF EXISTS uq_workflow_states_code`);
    await queryRunner.query(`ALTER TABLE workflow_states DROP COLUMN code`);
    await queryRunner.query(`ALTER TABLE workflow_states DROP COLUMN name`);
    await queryRunner.query(`ALTER TABLE workflow_states DROP COLUMN color`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS ux_workflow_states_global_state ON workflow_states (workflow_id, sale_order_state_id)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS ux_workflow_states_global_state`);
    await queryRunner.query(`ALTER TABLE workflow_states ADD COLUMN code varchar(100) NOT NULL`);
    await queryRunner.query(`ALTER TABLE workflow_states ADD COLUMN name varchar(150) NOT NULL`);
    await queryRunner.query(`ALTER TABLE workflow_states ADD COLUMN color varchar(50) NOT NULL`);
    await queryRunner.query(`ALTER TABLE workflow_states DROP COLUMN sale_order_state_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_sale_order_states_name`);
    await queryRunner.query(`DROP TABLE IF EXISTS sale_order_states`);
  }
}
