import { MigrationInterface, QueryRunner } from "typeorm";

export class AddGlobalWorkflowTransitions20260606060000 implements MigrationInterface {
  name = "AddGlobalWorkflowTransitions20260606060000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE workflow_transitions ALTER COLUMN from_state_id DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE workflow_transitions ADD COLUMN is_global boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE workflow_transitions ADD COLUMN excluded_state_ids uuid[] NOT NULL DEFAULT '{}'::uuid[]`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM workflow_transitions WHERE from_state_id IS NULL`);
    await queryRunner.query(`ALTER TABLE workflow_transitions DROP COLUMN excluded_state_ids`);
    await queryRunner.query(`ALTER TABLE workflow_transitions DROP COLUMN is_global`);
    await queryRunner.query(
      `ALTER TABLE workflow_transitions ALTER COLUMN from_state_id SET NOT NULL`,
    );
  }
}
