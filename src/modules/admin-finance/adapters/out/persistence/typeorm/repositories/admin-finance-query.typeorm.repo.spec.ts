import { AdminFinanceQueryTypeormRepository } from "./admin-finance-query.typeorm.repo";

describe("AdminFinanceQueryTypeormRepository", () => {
  it("joins sale orders in the collected summary so archived orders are excluded", async () => {
    const queries: string[] = [];
    const repo = new AdminFinanceQueryTypeormRepository({
      query: jest.fn(async (sql: string) => {
        queries.push(sql);
        return [{ collected: "0", pending: "0" }];
      }),
    } as never);

    await repo.getSummary({});
    expect(queries[0]).toMatch(/FROM sale_payments sp\s+JOIN sale_orders \w+ ON \w+\.id = sp\.sale_order_id/i);
    expect(queries[0]).toMatch(/\.is_active = true/i);
  });
});
