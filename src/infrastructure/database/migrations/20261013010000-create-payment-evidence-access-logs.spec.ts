import { CreatePaymentEvidenceAccessLogs20261013010000 } from './20261013010000-create-payment-evidence-access-logs';

describe('CreatePaymentEvidenceAccessLogs20261013010000', () => {
  it('creates append-only metadata indexes without storing evidence bytes or relying on purgeable foreign keys', async () => {
    const queryRunner = { query: jest.fn().mockResolvedValue(undefined) };
    await new CreatePaymentEvidenceAccessLogs20261013010000().up(queryRunner as never);
    const sql = queryRunner.query.mock.calls.map(([query]) => query).join('\n');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS payment_evidence_access_logs');
    expect(sql).toContain('evidence_attachment_id uuid');
    expect(sql).toContain('content_sha256 varchar(64) NOT NULL');
    expect(sql).toContain('size_bytes bigint NOT NULL CHECK (size_bytes > 0)');
    expect(sql).toContain('idx_payment_evidence_access_income_date');
    expect(sql).not.toMatch(/\b(bytea|storage_path|storage_key)\b/i);
    expect(sql).not.toContain('FOREIGN KEY');
  });
});
