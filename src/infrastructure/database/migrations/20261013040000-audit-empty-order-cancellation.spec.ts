import { AuditEmptyOrderCancellation20261013040000 } from './20261013040000-audit-empty-order-cancellation';

describe('AuditEmptyOrderCancellation20261013040000', () => {
  it('allows the order-cancellation audit action without removing financial audit actions', async () => {
    const queryRunner = { query: jest.fn().mockResolvedValue(undefined) };
    await new AuditEmptyOrderCancellation20261013040000().up(queryRunner as any);
    const sql = queryRunner.query.mock.calls.map(([query]: [string]) => query).join('\n');
    expect(sql).toContain("'sale_order_cancelled_without_payments'");
    expect(sql).toContain("'payment_posted'");
    expect(sql).toContain("'payment_cancelled_for_order_cancellation'");
  });
});
