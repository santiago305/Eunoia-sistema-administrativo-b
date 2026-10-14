import { HardenFinancialOutboxRetries20261012050000 } from "./20261012050000-harden-financial-outbox-retries";

describe("HardenFinancialOutboxRetries20261012050000", () => {
  it("adds retry/backoff metadata, lookup indexes, and the dedicated recovery permission", async () => {
    const queryRunner = { query: jest.fn().mockResolvedValue(undefined) };
    await new HardenFinancialOutboxRetries20261012050000().up(queryRunner as any);
    const sql = queryRunner.query.mock.calls.map(([query]: [string]) => query).join("\n");
    expect(sql).toContain("next_attempt_at timestamptz NOT NULL DEFAULT now()");
    expect(sql).toContain("dead_lettered_at timestamptz NULL");
    expect(sql).toContain("idx_financial_outbox_ready");
    expect(sql).toContain("income.outbox.manage");
  });

  it("removes only the additive retry metadata on rollback", async () => {
    const queryRunner = { query: jest.fn().mockResolvedValue(undefined) };
    await new HardenFinancialOutboxRetries20261012050000().down(queryRunner as any);
    expect(queryRunner.query).toHaveBeenCalledWith(expect.stringContaining("DROP COLUMN IF EXISTS next_attempt_at"));
    expect(queryRunner.query).toHaveBeenCalledWith(expect.stringContaining("UPDATE permissions SET is_active = false WHERE code = 'income.outbox.manage'"));
  });
});
