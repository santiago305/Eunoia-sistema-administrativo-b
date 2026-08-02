import { QueryRunner } from "typeorm";
import { BackfillSkuStockItems20260801000000 } from "./20260801000000-backfill-sku-stock-items";

describe("BackfillSkuStockItems20260801000000", () => {
  it("creates missing stock items for tracked SKUs idempotently", async () => {
    const queries: string[] = [];
    const queryRunner = {
      query: jest.fn(async (query: string) => {
        queries.push(query);
      }),
    } as unknown as QueryRunner;
    const migration = new BackfillSkuStockItems20260801000000();

    await migration.up(queryRunner);
    const sql = queries.join("\n");

    expect(sql).toContain("INSERT INTO pc_stock_items (sku_id, is_active)");
    expect(sql).toContain("SELECT s.sku_id, s.is_active");
    expect(sql).toContain("s.is_stock_tracked = true");
    expect(sql).toContain("WHERE si.sku_id = s.sku_id");
    expect(sql).toContain("ON CONFLICT (sku_id) DO NOTHING");
  });

  it("does not delete repaired stock items on rollback", async () => {
    const queryRunner = {
      query: jest.fn(),
    } as unknown as QueryRunner;
    const migration = new BackfillSkuStockItems20260801000000();

    await migration.down(queryRunner);

    expect(queryRunner.query).not.toHaveBeenCalled();
  });
});
