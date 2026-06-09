import { MigrationInterface, QueryRunner } from "typeorm";

export class AddWorkflowTransitionPurpose20260606080000 implements MigrationInterface {
  name = "AddWorkflowTransitionPurpose20260606080000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE workflow_transitions ADD COLUMN IF NOT EXISTS effect varchar(20) NOT NULL DEFAULT 'MOVE_STATE'`,
    );
    await queryRunner.query(
      `ALTER TABLE workflow_transitions ALTER COLUMN to_state_id DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE workflow_transitions ADD CONSTRAINT chk_workflow_transition_effect CHECK (effect IN ('MOVE_STATE', 'RUN_ACTIONS'))`,
    );
    await queryRunner.query(
      `ALTER TABLE workflow_transitions ADD CONSTRAINT chk_workflow_transition_effect_target CHECK ((effect = 'MOVE_STATE' AND to_state_id IS NOT NULL) OR (effect = 'RUN_ACTIONS' AND to_state_id IS NULL))`,
    );
    await queryRunner.query(
      `ALTER TABLE workflow_transitions ADD COLUMN purpose varchar(20) NOT NULL DEFAULT 'STANDARD'`,
    );
    await queryRunner.query(
      `ALTER TABLE workflow_transitions ADD CONSTRAINT chk_workflow_transition_purpose CHECK (purpose IN ('STANDARD', 'CANCEL'))`,
    );
    await queryRunner.query(
      `ALTER TABLE workflow_transitions ADD CONSTRAINT chk_workflow_cancel_is_global CHECK (purpose <> 'CANCEL' OR is_global = true)`,
    );
    await queryRunner.query(
      `UPDATE workflow_transitions SET purpose = 'CANCEL' WHERE is_global = true AND upper(code) = 'CANCEL'`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX uq_workflow_transition_cancel_purpose ON workflow_transitions (workflow_id) WHERE purpose = 'CANCEL'`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX uq_workflow_transition_cancel_purpose`);
    await queryRunner.query(`ALTER TABLE workflow_transitions DROP CONSTRAINT chk_workflow_cancel_is_global`);
    await queryRunner.query(`ALTER TABLE workflow_transitions DROP CONSTRAINT chk_workflow_transition_purpose`);
    await queryRunner.query(`ALTER TABLE workflow_transitions DROP COLUMN purpose`);
    await queryRunner.query(`ALTER TABLE workflow_transitions DROP CONSTRAINT chk_workflow_transition_effect_target`);
    await queryRunner.query(`ALTER TABLE workflow_transitions DROP CONSTRAINT chk_workflow_transition_effect`);
    await queryRunner.query(`ALTER TABLE workflow_transitions ALTER COLUMN to_state_id SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE workflow_transitions DROP COLUMN effect`);
  }
}
