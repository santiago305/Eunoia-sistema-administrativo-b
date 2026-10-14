import { databaseMigrations } from '../typeorm.config';
import { ManagePaymentEvidenceQuarantine20261013030000 } from './20261013030000-manage-payment-evidence-quarantine';

describe('ManagePaymentEvidenceQuarantine20261013030000', () => {
  it('is registered and adds permission, recovery trace fields, and the audit action', async () => {
    expect(databaseMigrations).toContain(ManagePaymentEvidenceQuarantine20261013030000);
    const runner = { query: jest.fn().mockResolvedValue(undefined) };
    await new ManagePaymentEvidenceQuarantine20261013030000().up(runner as never);
    const sql = runner.query.mock.calls.map(([query]) => query).join('\n');
    expect(sql).toContain('recovered_by_user_id uuid');
    expect(sql).toContain('recovery_reason varchar(500)');
    expect(sql).toContain('recovered_at timestamptz');
    expect(sql).toContain('payment_evidence_quarantine_recovered');
    expect(sql).toContain('payment_pending_edited');
    expect(sql).toContain('income_reconciled');
    expect(sql).toContain('customer_refund_reversed');
    expect(sql).toContain('payment_reentered');
    expect(sql).toContain('customer_credit_created_from_total_reduction');
    expect(sql).toContain('payment_transferred_during_order_cancellation');
    expect(sql).toContain('payment_received_from_cancelled_order');
    expect(sql).toContain('income.evidence.quarantine.manage');
  });
});
