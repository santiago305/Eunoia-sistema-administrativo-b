import { QueryRunner } from "typeorm";
import { AddSaleOrderPackSnapshots20260804015000 } from "./20260804015000-add-sale-order-pack-snapshots";

describe("AddSaleOrderPackSnapshots20260804015000", () => {
  it("adds and backfills immutable pack and SKU presentation snapshots", async () => {
    const queries: string[] = [];
    const queryRunner = { query: jest.fn(async (query: string) => queries.push(query)) } as unknown as QueryRunner;

    await new AddSaleOrderPackSnapshots20260804015000().up(queryRunner);
    const sql = queries.join("\n");

    expect(sql).toContain("pack_name_snapshot");
    expect(sql).toContain("sku_name_snapshot");
    expect(sql).toContain("attributes_snapshot");
    expect(sql).toContain("UPDATE sale_order_items");
    expect(sql).toContain("UPDATE sale_order_item_components");
  });
});
