import { databaseMigrations } from "../typeorm.config";
import { HardenPaymentEvidenceAndAudit20261007000000 } from "./20261007000000-harden-payment-evidence-and-audit";

describe("HardenPaymentEvidenceAndAudit20261007000000", () => {
  it("is registered and keeps the evidence backfill idempotent", async () => {
    expect(databaseMigrations).toContain(HardenPaymentEvidenceAndAudit20261007000000);
    const queries: string[] = [];
    const queryRunner = { query: jest.fn(async (sql: string) => queries.push(sql)) };
    await new HardenPaymentEvidenceAndAudit20261007000000().up(queryRunner as never);
    const sql = queries.join("\n");
    expect(sql).toContain("NOT EXISTS");
    expect(sql).toContain("PAYMENT_PROOF");
    expect(sql).toContain("payment_evidence_attached");
    expect(sql).toContain("action_execution TYPE varchar(50)");
  });
});
