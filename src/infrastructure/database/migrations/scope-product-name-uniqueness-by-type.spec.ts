import { QueryRunner } from "typeorm";
import { ScopeProductNameUniquenessByType20260804000000 } from "./20260804000000-scope-product-name-uniqueness-by-type";

describe("ScopeProductNameUniquenessByType20260804000000", () => {
  it("replaces global product-name uniqueness with type-scoped uniqueness", async () => {
    const queries: string[] = [];
    const queryRunner = {
      query: jest.fn(async (query: string) => {
        queries.push(query);
      }),
    } as unknown as QueryRunner;
    const migration = new ScopeProductNameUniquenessByType20260804000000();

    await migration.up(queryRunner);
    const sql = queries.join("\n");

    expect(sql).toContain("DROP CONSTRAINT IF EXISTS pc_products_name_key");
    expect(sql).toContain("DROP INDEX IF EXISTS ux_pc_products_name");
    expect(sql).toContain("CREATE UNIQUE INDEX IF NOT EXISTS ux_pc_products_type_name");
    expect(sql).not.toContain("DELETE FROM pc_products");
    expect(sql).not.toContain("DELETE FROM pc_recipes");
    expect(sql).toContain("CREATE OR REPLACE FUNCTION normalize_product_name(value text)");
    expect(sql).toContain("ON pc_products (type, normalize_product_name(name))");
    expect(sql).toContain("WHERE is_deleted = false");
  });

  it("restores global product-name uniqueness on rollback", async () => {
    const queries: string[] = [];
    const queryRunner = {
      query: jest.fn(async (query: string) => {
        queries.push(query);
      }),
    } as unknown as QueryRunner;
    const migration = new ScopeProductNameUniquenessByType20260804000000();

    await migration.down(queryRunner);
    const sql = queries.join("\n");

    expect(sql).toContain("DROP INDEX IF EXISTS ux_pc_products_type_name");
    expect(sql).toContain("ADD CONSTRAINT pc_products_name_key UNIQUE (name)");
  });
});
