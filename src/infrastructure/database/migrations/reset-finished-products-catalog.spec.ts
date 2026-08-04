import { QueryRunner } from "typeorm";
import { ResetFinishedProductsCatalog20260803590000 } from "./20260803590000-reset-finished-products-catalog";

describe("ResetFinishedProductsCatalog20260803590000", () => {
  it("removes finished products and their packs without targeting materials", async () => {
    const queries: string[] = [];
    const queryRunner = {
      query: jest.fn(async (query: string) => queries.push(query)),
    } as unknown as QueryRunner;

    await new ResetFinishedProductsCatalog20260803590000().up(queryRunner);
    const sql = queries.join("\n");

    expect(sql).toContain("DELETE FROM packs");
    expect(sql).toContain("DELETE FROM pc_recipes");
    expect(sql).toContain("DELETE FROM pc_products");
    expect(sql).toContain("WHERE type = 'PRODUCT'");
    expect(sql).not.toContain("WHERE type = 'MATERIAL'");
  });

  it("blocks the reset when operational references exist", async () => {
    const queries: string[] = [];
    const queryRunner = {
      query: jest.fn(async (query: string) => queries.push(query)),
    } as unknown as QueryRunner;

    await new ResetFinishedProductsCatalog20260803590000().up(queryRunner);
    const sql = queries.join("\n");

    expect(sql).toContain("sale_order_item_components");
    expect(sql).toContain("sale_order_items");
    expect(sql).toContain("production_order_items");
    expect(sql).toContain("pc_inventory_document_items");
    expect(sql).toContain("pc_inventory_ledger");
    expect(sql).toContain("purchase_order_items");
    expect(sql).toContain("Finished product catalog reset blocked");
  });
});
