import { MigrationInterface, QueryRunner } from 'typeorm';

/** Allows an explicit audit event for retry-safe cancellations that had no active payments. */
export class AuditEmptyOrderCancellation20261013040000 implements MigrationInterface {
  name = 'AuditEmptyOrderCancellation20261013040000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
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
          'payment_keep_as_credit', 'payment_apply_to_order', 'payment_refund',
          'sale_order_cancelled_without_payments'
        ));
    `);
  }

  async down(): Promise<void> {
    // Forward-only: the audit action may already be present in retained history.
  }
}
