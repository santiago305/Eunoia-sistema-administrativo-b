import { databaseMigrations } from "../typeorm.config";
import { IndexFinancialIdempotencyResultLookup20261012020000 } from "./20261012020000-index-financial-idempotency-result-lookup";

describe("IndexFinancialIdempotencyResultLookup20261012020000", () => {
  it("registers an index that supports owner-scoped batch result recovery", async () => {
    expect(databaseMigrations).toContain(IndexFinancialIdempotencyResultLookup20261012020000);
    const runner = { query: jest.fn() };

    await new IndexFinancialIdempotencyResultLookup20261012020000().up(runner as never);

    expect(runner.query).toHaveBeenCalledWith(expect.stringContaining("(idempotency_key, scope_key, created_at DESC)"));
  });

  it("removes only its lookup index on rollback", async () => {
    const runner = { query: jest.fn() };

    await new IndexFinancialIdempotencyResultLookup20261012020000().down(runner as never);

    expect(runner.query).toHaveBeenCalledWith("DROP INDEX IF EXISTS idx_financial_idempotency_result_lookup");
  });
});
