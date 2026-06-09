import { MigrationInterface, QueryRunner } from "typeorm";

export class AddWorkflowTransitionHandles20260606030000 implements MigrationInterface {
  name = "AddWorkflowTransitionHandles20260606030000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE workflow_transitions ADD COLUMN IF NOT EXISTS source_handle varchar NULL`);
    await queryRunner.query(`ALTER TABLE workflow_transitions ADD COLUMN IF NOT EXISTS target_handle varchar NULL`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE workflow_transitions DROP COLUMN IF EXISTS target_handle`);
    await queryRunner.query(`ALTER TABLE workflow_transitions DROP COLUMN IF EXISTS source_handle`);
  }
}
