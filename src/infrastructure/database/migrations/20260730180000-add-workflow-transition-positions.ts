import { MigrationInterface, QueryRunner } from "typeorm";

export class AddWorkflowTransitionPositions20260730180000 implements MigrationInterface {
  name = "AddWorkflowTransitionPositions20260730180000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE workflow_transitions ADD COLUMN IF NOT EXISTS position_x double precision NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE workflow_transitions ADD COLUMN IF NOT EXISTS position_y double precision NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE workflow_transitions DROP COLUMN IF EXISTS position_y`);
    await queryRunner.query(`ALTER TABLE workflow_transitions DROP COLUMN IF EXISTS position_x`);
  }
}
