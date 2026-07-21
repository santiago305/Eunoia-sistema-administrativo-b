import { QueryRunner } from "typeorm";
import { AlignRolesCurrentSchema20260720010000 } from "./20260720010000-align-roles-current-schema";

describe("AlignRolesCurrentSchema20260720010000", () => {
  it("backs up legacy names, preserves role ids, resolves duplicates and retires the legacy column", async () => {
    const queries: string[] = [];
    const queryRunner = {
      query: jest.fn(async (query: string) => {
        queries.push(query);
      }),
    } as unknown as QueryRunner;

    await new AlignRolesCurrentSchema20260720010000().up(queryRunner);

    const sql = queries.join("\n");
    expect(sql).toContain("NULLIF(btrim(name), '')");
    expect(sql).toContain("PARTITION BY lower(btrim(description))");
    expect(sql).toContain("ORDER BY created_at, role_id");
    expect(sql).toContain("ALTER TABLE roles ALTER COLUMN description SET NOT NULL");
    expect(sql).toContain("ALTER TABLE roles DROP COLUMN IF EXISTS name");
    expect(sql).toContain("CREATE UNIQUE INDEX IF NOT EXISTS ux_roles_description_normalized");
    expect(sql).toContain("ON roles (lower(btrim(description)))");
  });
});
