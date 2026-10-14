import { IdempotentIncomeEvidenceUpload20261013000000 } from './20261013000000-idempotent-income-evidence-upload';

describe('IdempotentIncomeEvidenceUpload20261013000000', () => {
  it('stores each upload key and content digest with a scoped uniqueness constraint', async () => {
    const queryRunner = { query: jest.fn().mockResolvedValue(undefined) };
    await new IdempotentIncomeEvidenceUpload20261013000000().up(queryRunner as never);
    const sql = queryRunner.query.mock.calls.map(([query]) => query).join('\n');
    expect(sql).toContain('upload_idempotency_key uuid NULL');
    expect(sql).toContain('content_sha256 varchar(64) NULL');
    expect(sql).toContain('sale_order_payment_id');
    expect(sql).toContain('uploaded_by_user_id');
    expect(sql).toContain('WHERE upload_idempotency_key IS NOT NULL');
  });
});
