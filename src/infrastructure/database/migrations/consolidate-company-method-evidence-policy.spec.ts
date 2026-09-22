import { QueryRunner } from "typeorm";
import { ConsolidateCompanyMethodEvidencePolicy20260922120000 } from "./20260922120000-consolidate-company-method-evidence-policy";

describe("ConsolidateCompanyMethodEvidencePolicy20260922120000", () => {
  it("backfills the canonical policy before removing the legacy boolean", async () => {
    const queries: string[] = [];
    const queryRunner = {
      query: jest.fn(async (query: string) => {
        queries.push(query);
      }),
    } as unknown as QueryRunner;

    await new ConsolidateCompanyMethodEvidencePolicy20260922120000().up(queryRunner);

    const sql = queries.join("\n");
    expect(sql.indexOf("SET evidence_policy")).toBeLessThan(
      sql.indexOf("DROP COLUMN IF EXISTS requires_voucher"),
    );
    expect(sql).toContain("chk_company_methods_evidence_policy");
    expect(sql).toContain("'INHERIT', 'REQUIRED', 'OPTIONAL'");
  });
});
