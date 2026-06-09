import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateWorkflowActions20260606040000 implements MigrationInterface {
  name = "CreateWorkflowActions20260606040000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE workflow_actions (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        transition_id uuid NOT NULL REFERENCES workflow_transitions(id) ON DELETE CASCADE,
        type varchar(50) NOT NULL,
        config jsonb NOT NULL DEFAULT '{}'::jsonb,
        position int NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz
      )
    `);
    await queryRunner.query(
      `CREATE INDEX idx_workflow_actions_transition_position ON workflow_actions (transition_id, position)`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_workflow_actions_transition_position`);
    await queryRunner.query(`DROP TABLE IF EXISTS workflow_actions`);
  }
}
