import { MigrationInterface, QueryRunner } from "typeorm";

export class AddWorkflowAutomaticBranches20260612000000 implements MigrationInterface {
  name = "AddWorkflowAutomaticBranches20260612000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "workflow_transitions"
      ADD COLUMN IF NOT EXISTS "auto_trigger" boolean NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS "priority" integer NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "else_effect" varchar(20),
      ADD COLUMN IF NOT EXISTS "else_to_state_id" uuid
    `);
    await queryRunner.query(`
      ALTER TABLE "workflow_actions"
      ADD COLUMN IF NOT EXISTS "branch" varchar(10) NOT NULL DEFAULT 'THEN'
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'fk_workflow_transitions_else_state'
        ) THEN
          ALTER TABLE "workflow_transitions"
          ADD CONSTRAINT "fk_workflow_transitions_else_state"
          FOREIGN KEY ("else_to_state_id") REFERENCES "workflow_states"("id") ON DELETE RESTRICT;
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_workflow_transitions_auto"
      ON "workflow_transitions" ("workflow_id", "from_state_id", "auto_trigger", "priority")
      WHERE "is_active" = true
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_workflow_transitions_auto"`);
    await queryRunner.query(`ALTER TABLE "workflow_transitions" DROP CONSTRAINT "fk_workflow_transitions_else_state"`);
    await queryRunner.query(`ALTER TABLE "workflow_actions" DROP COLUMN "branch"`);
    await queryRunner.query(`
      ALTER TABLE "workflow_transitions"
      DROP COLUMN "else_to_state_id",
      DROP COLUMN "else_effect",
      DROP COLUMN "priority",
      DROP COLUMN "auto_trigger"
    `);
  }
}
