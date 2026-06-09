import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateWorkflowEngine20260606010000 implements MigrationInterface {
  name = "CreateWorkflowEngine20260606010000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS workflows (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        name varchar(150) NOT NULL,
        normalized_name varchar(150) NOT NULL UNIQUE,
        description text,
        is_active boolean NOT NULL DEFAULT false,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS workflow_states (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        workflow_id uuid NOT NULL REFERENCES workflows(id) ON DELETE RESTRICT,
        code varchar(100) NOT NULL,
        name varchar(150) NOT NULL,
        color varchar(50) NOT NULL,
        position int NOT NULL DEFAULT 0,
        is_initial boolean NOT NULL DEFAULT false,
        is_final boolean NOT NULL DEFAULT false,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz,
        CONSTRAINT uq_workflow_states_code UNIQUE (workflow_id, code)
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS workflow_transitions (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        workflow_id uuid NOT NULL REFERENCES workflows(id) ON DELETE RESTRICT,
        code varchar(100) NOT NULL,
        name varchar(150) NOT NULL,
        effect varchar(20) NOT NULL DEFAULT 'MOVE_STATE',
        from_state_id uuid NOT NULL REFERENCES workflow_states(id) ON DELETE RESTRICT,
        to_state_id uuid REFERENCES workflow_states(id) ON DELETE RESTRICT,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz,
        CONSTRAINT uq_workflow_transitions_code UNIQUE (workflow_id, code)
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS workflow_conditions (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        transition_id uuid NOT NULL REFERENCES workflow_transitions(id) ON DELETE CASCADE,
        type varchar(50) NOT NULL,
        config jsonb NOT NULL DEFAULT '{}'::jsonb,
        position int NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS sale_order_state_history (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        sale_order_id uuid NOT NULL REFERENCES sale_orders(id) ON DELETE RESTRICT,
        workflow_id uuid NOT NULL REFERENCES workflows(id) ON DELETE RESTRICT,
        transition_id uuid REFERENCES workflow_transitions(id) ON DELETE RESTRICT,
        from_state_id uuid REFERENCES workflow_states(id) ON DELETE RESTRICT,
        to_state_id uuid NOT NULL REFERENCES workflow_states(id) ON DELETE RESTRICT,
        executed_by uuid NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
        executed_at timestamptz NOT NULL DEFAULT now(),
        metadata jsonb
      );
    `);

    await queryRunner.query(`ALTER TABLE sale_orders ADD COLUMN IF NOT EXISTS workflow_id uuid NULL REFERENCES workflows(id) ON DELETE RESTRICT`);
    await queryRunner.query(`ALTER TABLE sale_orders ADD COLUMN IF NOT EXISTS current_state_id uuid NULL REFERENCES workflow_states(id) ON DELETE RESTRICT`);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_workflow_states_workflow ON workflow_states (workflow_id, position)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_workflow_transitions_from_state ON workflow_transitions (workflow_id, from_state_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_sale_order_state_history_sale_order ON sale_order_state_history (sale_order_id, executed_at)`);

    await queryRunner.query(`DROP INDEX IF EXISTS idx_sale_orders_schedule_date`);
    await queryRunner.query(`ALTER TABLE sale_orders DROP COLUMN IF EXISTS agenda_status`);
    await queryRunner.query(`ALTER TABLE sale_orders DROP COLUMN IF EXISTS delivery_status`);
    await queryRunner.query(`DROP TYPE IF EXISTS agenda_status`);
    await queryRunner.query(`DROP TYPE IF EXISTS delivery_status`);
  }

  public async down(): Promise<void> {
    // No-op: migration is additive and destructive to legacy enums by design.
  }
}
