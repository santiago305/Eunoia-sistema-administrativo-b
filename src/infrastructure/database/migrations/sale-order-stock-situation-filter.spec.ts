import { databaseMigrations } from "../typeorm.config";
import { AddSaleOrderStockSituationFilter20260826090000 } from "./20260826090000-add-sale-order-stock-situation-filter";

describe("AddSaleOrderStockSituationFilter20260826090000", () => {
  it("is registered and backfills historical reversions", async () => {
    expect(databaseMigrations).toContain(
      AddSaleOrderStockSituationFilter20260826090000,
    );
    const queries: string[] = [];
    const queryRunner = {
      query: jest.fn(async (sql: string) => queries.push(sql)),
    };

    await new AddSaleOrderStockSituationFilter20260826090000().up(
      queryRunner as never,
    );
    const sql = queries.join("\n");

    expect(sql).toContain("stock_reverted_bool boolean NOT NULL DEFAULT false");
    expect(sql).toContain("action.type = 'REVERT_STOCK'");
    expect(sql).toContain("history.metadata ->> 'stockRestored' = 'true'");
    expect(sql).toContain("idx_pc_inventory_documents_sale_order_stock");
  });
});
