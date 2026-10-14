import { CreatePaymentEvidenceUploadOperations20261013020000 } from './20261013020000-create-payment-evidence-upload-operations';

describe('CreatePaymentEvidenceUploadOperations20261013020000', () => {
  it('creates an idempotent checkpoint with resumable states and recovery indexes', async () => {
    const queryRunner = { query: jest.fn().mockResolvedValue(undefined) };
    await new CreatePaymentEvidenceUploadOperations20261013020000().up(queryRunner as never);
    const sql = queryRunner.query.mock.calls.map(([query]) => query).join('\n');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS payment_evidence_upload_operations');
    expect(sql).toContain("'PREPARING', 'STAGED', 'PROMOTED', 'COMPLETED', 'FAILED', 'QUARANTINED'");
    expect(sql).toContain('UNIQUE INDEX IF NOT EXISTS uq_payment_evidence_upload_operation_key');
    expect(sql).toContain('idx_payment_evidence_upload_operation_recovery');
    expect(sql).toContain('staging_key varchar(500)');
    expect(sql).toContain('promoted_key varchar(500)');
    expect(sql).toContain('quarantine_key varchar(500)');
  });
});
