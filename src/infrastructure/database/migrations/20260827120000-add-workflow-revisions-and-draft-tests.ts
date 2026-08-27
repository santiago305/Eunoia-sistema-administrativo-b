import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWorkflowRevisionsAndDraftTests20260827120000
  implements MigrationInterface
{
  name = 'AddWorkflowRevisionsAndDraftTests20260827120000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE workflows
        ADD COLUMN IF NOT EXISTS family_id uuid,
        ADD COLUMN IF NOT EXISTS revision integer NOT NULL DEFAULT 1,
        ADD COLUMN IF NOT EXISTS lifecycle_status varchar(20) NOT NULL DEFAULT 'PUBLISHED',
        ADD COLUMN IF NOT EXISTS is_current boolean NOT NULL DEFAULT true,
        ADD COLUMN IF NOT EXISTS based_on_workflow_id uuid NULL REFERENCES workflows(id) ON DELETE RESTRICT,
        ADD COLUMN IF NOT EXISTS published_at timestamptz NULL,
        ADD COLUMN IF NOT EXISTS published_by uuid NULL REFERENCES users(user_id) ON DELETE SET NULL
    `);
    await queryRunner.query(`UPDATE workflows SET family_id = id WHERE family_id IS NULL`);
    await queryRunner.query(`ALTER TABLE workflows ALTER COLUMN family_id SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE workflows DROP CONSTRAINT IF EXISTS workflows_normalized_name_key`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_workflows_family_revision
      ON workflows (family_id, revision)
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_workflows_current_family
      ON workflows (family_id)
      WHERE is_current = true
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_workflows_current_normalized_name
      ON workflows (normalized_name)
      WHERE is_current = true AND lifecycle_status = 'PUBLISHED'
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_workflows_current_name
      ON workflows (normalized_name, lifecycle_status, is_current)
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS workflow_draft_test_sessions (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        draft_workflow_id uuid NOT NULL REFERENCES workflows(id) ON DELETE RESTRICT,
        sale_order_id uuid NOT NULL REFERENCES sale_orders(id) ON DELETE RESTRICT,
        original_workflow_id uuid NULL REFERENCES workflows(id) ON DELETE RESTRICT,
        original_state_id uuid NULL REFERENCES workflow_states(id) ON DELETE RESTRICT,
        original_stock_status varchar(20) NOT NULL,
        original_warehouse_id uuid NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
        original_invoice_send boolean NOT NULL,
        original_prepared boolean NOT NULL,
        original_preguide boolean NOT NULL,
        original_reserve_bool boolean NOT NULL,
        original_stock_reverted_bool boolean NOT NULL,
        status varchar(20) NOT NULL DEFAULT 'ACTIVE',
        started_by uuid NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
        started_at timestamptz NOT NULL DEFAULT now(),
        reverted_by uuid NULL REFERENCES users(user_id) ON DELETE SET NULL,
        reverted_at timestamptz NULL
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_workflow_draft_test_active_order
      ON workflow_draft_test_sessions (sale_order_id)
      WHERE status = 'ACTIVE'
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_workflow_draft_test_active_workflow
      ON workflow_draft_test_sessions (draft_workflow_id, status)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS workflow_draft_test_sessions`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_workflows_current_name`);
    await queryRunner.query(`DROP INDEX IF EXISTS ux_workflows_current_normalized_name`);
    await queryRunner.query(`DROP INDEX IF EXISTS ux_workflows_current_family`);
    await queryRunner.query(`DROP INDEX IF EXISTS ux_workflows_family_revision`);
    await queryRunner.query(`
      ALTER TABLE workflows
        DROP COLUMN IF EXISTS published_by,
        DROP COLUMN IF EXISTS published_at,
        DROP COLUMN IF EXISTS based_on_workflow_id,
        DROP COLUMN IF EXISTS is_current,
        DROP COLUMN IF EXISTS lifecycle_status,
        DROP COLUMN IF EXISTS revision,
        DROP COLUMN IF EXISTS family_id
    `);
    await queryRunner.query(`ALTER TABLE workflows ADD CONSTRAINT workflows_normalized_name_key UNIQUE (normalized_name)`);
  }
}
