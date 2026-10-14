import { MigrationInterface, QueryRunner } from 'typeorm';

/** Explicitly authorized, auditable recovery of quarantined payment evidence. */
export class ManagePaymentEvidenceQuarantine20261013030000 implements MigrationInterface {
  name = 'ManagePaymentEvidenceQuarantine20261013030000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE payment_evidence_upload_operations
        ADD COLUMN IF NOT EXISTS recovered_by_user_id uuid,
        ADD COLUMN IF NOT EXISTS recovery_reason varchar(500),
        ADD COLUMN IF NOT EXISTS recovered_at timestamptz;

      ALTER TABLE sale_order_auditory
        ALTER COLUMN action_execution TYPE varchar(50);
      ALTER TABLE sale_order_auditory
        DROP CONSTRAINT IF EXISTS chk_sale_order_auditory_action;
      ALTER TABLE sale_order_auditory
        ADD CONSTRAINT chk_sale_order_auditory_action CHECK (action_execution IN (
          'delete', 'restore', 'preguide_on', 'preguide_off', 'prepared_on', 'prepared_off',
          'payment_evidence_attached', 'payment_evidence_quarantine_recovered',
          'payment_pending_edited', 'payment_corrected_out', 'payment_corrected_in',
          'payment_pending_created', 'payment_pending_transferred_out', 'payment_pending_transferred_in', 'payment_posted',
          'income_reconciled', 'income_unreconciled', 'customer_refund_created',
          'customer_refund_posted', 'customer_refund_cancelled', 'customer_refund_reversed',
          'payment_reversed', 'payment_cancelled', 'payment_cancelled_for_order_cancellation',
          'payment_reentered', 'customer_credit_applied', 'customer_credit_created_from_total_reduction',
          'payment_transferred_during_order_cancellation', 'payment_received_from_cancelled_order',
          'payment_keep_as_credit', 'payment_apply_to_order', 'payment_refund'
        ));

      INSERT INTO permissions (code, name, description, module, resource, action, type)
      VALUES ('income.evidence.quarantine.manage', 'Recuperar evidencia en cuarentena',
        'Reincorporar evidencia de pago en cuarentena tras validar su integridad',
        'income', 'payment_evidence_quarantine', 'manage', 'action')
      ON CONFLICT (code) DO UPDATE SET
        name = EXCLUDED.name, description = EXCLUDED.description, module = EXCLUDED.module,
        resource = EXCLUDED.resource, action = EXCLUDED.action, type = EXCLUDED.type;
    `);
  }

  async down(): Promise<void> {
    // Forward-only: recovery history and the additional financial audit action are retained.
  }
}
