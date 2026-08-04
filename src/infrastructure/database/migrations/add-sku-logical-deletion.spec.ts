import { QueryRunner } from "typeorm";
import { AddSkuLogicalDeletion20260804010000 } from "./20260804010000-add-sku-logical-deletion";

describe("AddSkuLogicalDeletion20260804010000", () => {
  it("adds logical deletion and an active catalog lookup index", async () => {
    const queries: string[] = [];
    const queryRunner = {
      query: jest.fn(async (query: string) => queries.push(query)),
    } as unknown as QueryRunner;

    await new AddSkuLogicalDeletion20260804010000().up(queryRunner);
    const sql = queries.join("\n");

    expect(sql).toContain("ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false");
    expect(sql).toContain("WHERE is_deleted = false");
  });
});
