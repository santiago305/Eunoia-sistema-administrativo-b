import { QueryRunner } from "typeorm";
import { NormalizePaymentMethodCatalog20260920090000 } from "./20260920090000-normalize-payment-method-catalog";

describe("NormalizePaymentMethodCatalog20260920090000", () => {
  it("keeps its temporary mapping alive until all reconciliation statements finish", async () => {
    const queries: string[] = [];
    const queryRunner = {
      query: jest.fn(async (query: string) => {
        queries.push(query);
      }),
    } as unknown as QueryRunner;

    await new NormalizePaymentMethodCatalog20260920090000().up(queryRunner);

    const createIndex = queries.findIndex((query) => query.includes("CREATE TEMP TABLE payment_method_code_map"));
    const dropIndex = queries.findIndex((query) => query.includes("DROP TABLE IF EXISTS payment_method_code_map"));
    const lastUseIndex = queries.reduce(
      (last, query, index) => query.includes("FROM payment_method_code_map") ? index : last,
      -1,
    );

    expect(createIndex).toBeGreaterThanOrEqual(0);
    expect(queries[createIndex]).not.toContain("ON COMMIT DROP");
    expect(dropIndex).toBeGreaterThan(lastUseIndex);
  });
});
