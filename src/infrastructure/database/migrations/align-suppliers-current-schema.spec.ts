import { QueryRunner } from "typeorm";
import { AlignSuppliersCurrentSchema20260717090000 } from "./20260717090000-align-suppliers-current-schema";

describe("AlignSuppliersCurrentSchema20260717090000", () => {
  it("aligns legacy suppliers columns with the current entity schema", async () => {
    const queries: string[] = [];
    const queryRunner = {
      query: jest.fn(async (query: string) => {
        queries.push(query);
      }),
    } as unknown as QueryRunner;
    const migration = new AlignSuppliersCurrentSchema20260717090000();

    await migration.up(queryRunner);
    const sql = queries.join("\n");

    expect(sql).toContain("CREATE TYPE supplier_doc_type AS ENUM ('06', '01', '04')");
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS document_type supplier_doc_type");
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS document_number varchar(30)");
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS trade_name varchar(200)");
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS lead_time_days int");
    expect(sql).toContain("column_name = 'doc_type'");
    expect(sql).toContain("column_name = 'doc_number'");
    expect(sql).toContain("row_number() OVER");
    expect(sql).toContain("ALTER TABLE suppliers ALTER COLUMN document_type SET NOT NULL");
    expect(sql).toContain("ALTER TABLE suppliers ALTER COLUMN document_number SET NOT NULL");
    expect(sql).toContain("CREATE UNIQUE INDEX IF NOT EXISTS ux_suppliers_document");
  });
});
