import { MigrationInterface, QueryRunner } from "typeorm";

export class AddWorkflowStateNodePositions20260606020000 implements MigrationInterface {
  name = "AddWorkflowStateNodePositions20260606020000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE workflow_states ADD COLUMN IF NOT EXISTS position_x double precision NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE workflow_states ADD COLUMN IF NOT EXISTS position_y double precision NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE workflow_states DROP COLUMN IF EXISTS position_y`);
    await queryRunner.query(`ALTER TABLE workflow_states DROP COLUMN IF EXISTS position_x`);
  }
}
