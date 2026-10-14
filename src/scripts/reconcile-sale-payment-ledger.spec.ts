import { collectSalePaymentReconciliation, salePaymentReconciliationQueries } from "../../scripts/reconcile-sale-payment-ledger";

describe("sale-payment ledger reconciliation report", () => {
  it("collects every reconciliation dimension with read-only aggregate queries", async () => {
    const source = { query: jest.fn(async (_sql: string) => [] as unknown[]) };
    const sections = await collectSalePaymentReconciliation(source);

    expect(Object.keys(sections)).toEqual(salePaymentReconciliationQueries.map(({ section }) => section));
    expect(source.query).toHaveBeenCalledTimes(5);
    expect(source.query.mock.calls.every(([sql]) => /^\s*SELECT\b/i.test(sql))).toBe(true);
    expect(salePaymentReconciliationQueries[0].sql).toContain("sale_order_id, payment_date");
    expect(salePaymentReconciliationQueries[0].sql).toContain("company_payment_account_id, currency, status");
    expect(salePaymentReconciliationQueries[1].sql).toContain("allocated_sale_order_id");
    expect(salePaymentReconciliationQueries[4].sql).toContain("available_amount");
  });
});
