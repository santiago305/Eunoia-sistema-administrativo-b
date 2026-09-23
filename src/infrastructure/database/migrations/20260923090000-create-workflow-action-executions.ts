import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWorkflowActionExecutions20260923090000 implements MigrationInterface {
  name = 'CreateWorkflowActionExecutions20260923090000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS workflow_action_executions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        sale_order_id uuid NOT NULL,
        transition_id uuid NULL,
        action_id uuid NULL,
        action_type varchar(80) NOT NULL,
        idempotency_key varchar(255) NOT NULL,
        status varchar(20) NOT NULL,
        attempts integer NOT NULL DEFAULT 1,
        evidence jsonb NULL,
        error jsonb NULL,
        started_at timestamptz NOT NULL DEFAULT now(),
        completed_at timestamptz NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_workflow_action_executions_idempotency_key UNIQUE (idempotency_key),
        CONSTRAINT chk_workflow_action_executions_status
          CHECK (status IN ('STARTED', 'COMPLETED', 'FAILED', 'SKIPPED'))
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_workflow_action_executions_sale_order
      ON workflow_action_executions (sale_order_id, created_at DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_workflow_action_executions_transition
      ON workflow_action_executions (transition_id, action_id)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS idx_workflow_action_executions_transition');
    await queryRunner.query('DROP INDEX IF EXISTS idx_workflow_action_executions_sale_order');
    await queryRunner.query('DROP TABLE IF EXISTS workflow_action_executions');
  }
}
