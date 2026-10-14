import { PaymentLifecycleFourStates20261008000000 } from "./20261008000000-payment-lifecycle-four-states";

describe("PaymentLifecycleFourStates20261008000000", () => {
  it.each([
    ["DRAFT", 2],
    ["VOIDED", 1],
    ["APPROVED", 1],
    [null, 1],
  ])("stops before changing the schema while unsupported %s payments need classification", async (status, total) => {
    const query = jest.fn().mockResolvedValueOnce([{ status, total }]);
    const migration = new PaymentLifecycleFourStates20261008000000();

    await expect(migration.up({ query } as any)).rejects.toThrow(`${status ?? "NULL"}=${total}`);
    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0][0]).toContain("status NOT IN ('PENDING_CONFIRMATION', 'POSTED', 'CANCELLED', 'REVERSED')");
  });

  it("keeps canonical states and backfills posted metadata when no legacy rows remain", async () => {
    const query = jest.fn().mockResolvedValueOnce([]).mockResolvedValue([]);
    const migration = new PaymentLifecycleFourStates20261008000000();

    await migration.up({ query } as any);

    const statements = query.mock.calls.map(([sql]) => String(sql));
    expect(statements.some((sql) => sql.includes("SET status = 'PENDING_CONFIRMATION'") && sql.includes("status = 'DRAFT'"))).toBe(false);
    expect(statements.some((sql) => sql.includes("SET status = 'REVERSED'") && sql.includes("status = 'VOIDED'"))).toBe(false);
    expect(statements.some((sql) => sql.includes("posted_at = COALESCE"))).toBe(true);
    expect(statements.some((sql) => sql.includes("chk_sale_payments_lifecycle_status"))).toBe(true);
  });
});
