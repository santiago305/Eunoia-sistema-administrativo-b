import { MigrationInterface, QueryRunner } from "typeorm";

export class AlignPurchaseApprovalAndSupplierSkuSchema20260717100000 implements MigrationInterface {
  name = "AlignPurchaseApprovalAndSupplierSkuSchema20260717100000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);

    await queryRunner.query(`
      ALTER TABLE supplier_skus
      ADD COLUMN IF NOT EXISTS supplier_sku varchar(80),
      ADD COLUMN IF NOT EXISTS last_cost numeric(12,2),
      ADD COLUMN IF NOT EXISTS lead_time_days int;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_supplier_skus_supplier_sku
      ON supplier_skus (supplier_id, sku_id);
    `);

    await queryRunner.query(`
      ALTER TABLE approval_requests
      ADD COLUMN IF NOT EXISTS approval_request_id uuid,
      ADD COLUMN IF NOT EXISTS module varchar(80),
      ADD COLUMN IF NOT EXISTS action varchar(120),
      ADD COLUMN IF NOT EXISTS requested_by_user_id uuid,
      ADD COLUMN IF NOT EXISTS reviewed_by_user_id uuid,
      ADD COLUMN IF NOT EXISTS payload_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'approval_requests' AND column_name = 'id'
        ) THEN
          UPDATE approval_requests
          SET approval_request_id = id
          WHERE approval_request_id IS NULL;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      UPDATE approval_requests
      SET
        approval_request_id = COALESCE(approval_request_id, uuid_generate_v4()),
        module = COALESCE(NULLIF(module, ''), 'purchases'),
        action = COALESCE(NULLIF(action, ''), 'approve')
      WHERE approval_request_id IS NULL
        OR module IS NULL
        OR module = ''
        OR action IS NULL
        OR action = '';
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_approval_requests_approval_request_id
      ON approval_requests (approval_request_id);
    `);

    await queryRunner.query(`
      ALTER TABLE purchase_history_events
      ADD COLUMN IF NOT EXISTS purchase_history_event_id uuid,
      ADD COLUMN IF NOT EXISTS old_values jsonb,
      ADD COLUMN IF NOT EXISTS new_values jsonb,
      ADD COLUMN IF NOT EXISTS performed_by_user_id uuid,
      ADD COLUMN IF NOT EXISTS target_user_id uuid,
      ADD COLUMN IF NOT EXISTS approval_request_id uuid;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'purchase_history_events' AND column_name = 'id'
        ) THEN
          UPDATE purchase_history_events
          SET purchase_history_event_id = id
          WHERE purchase_history_event_id IS NULL;
        END IF;

        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'purchase_history_events' AND column_name = 'created_by'
        ) THEN
          UPDATE purchase_history_events
          SET performed_by_user_id = created_by
          WHERE performed_by_user_id IS NULL;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      UPDATE purchase_history_events
      SET purchase_history_event_id = uuid_generate_v4()
      WHERE purchase_history_event_id IS NULL;
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_purchase_history_events_event_id
      ON purchase_history_events (purchase_history_event_id);
    `);

    await queryRunner.query(`
      ALTER TABLE purchase_processing_approvals
      ADD COLUMN IF NOT EXISTS approval_id uuid,
      ADD COLUMN IF NOT EXISTS po_id uuid,
      ADD COLUMN IF NOT EXISTS requested_by uuid,
      ADD COLUMN IF NOT EXISTS reason text,
      ADD COLUMN IF NOT EXISTS reviewed_by uuid,
      ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
      ADD COLUMN IF NOT EXISTS review_comment text;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'purchase_processing_approvals' AND column_name = 'id'
        ) THEN
          UPDATE purchase_processing_approvals
          SET approval_id = id
          WHERE approval_id IS NULL;
        END IF;

        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'purchase_processing_approvals' AND column_name = 'purchase_id'
        ) THEN
          UPDATE purchase_processing_approvals
          SET po_id = purchase_id
          WHERE po_id IS NULL;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      UPDATE purchase_processing_approvals
      SET approval_id = COALESCE(approval_id, uuid_generate_v4())
      WHERE approval_id IS NULL;
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_purchase_processing_approvals_approval_id
      ON purchase_processing_approvals (approval_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_purchase_processing_approval_po_pending
      ON purchase_processing_approvals (po_id, status);
    `);
  }

  public async down(): Promise<void> {
    // Additive alignment migration. Keep production purchase and supplier data intact.
  }
}
