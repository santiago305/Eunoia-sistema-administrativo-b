import { HardenCompanyTreasuryAccounts20260921100000 } from "./20260921100000-harden-company-treasury-accounts";

describe("HardenCompanyTreasuryAccounts20260921100000", () => {
  it("adds scoped defaults and encrypts legacy identifiers without deleting records", async () => {
    process.env.PAYMENT_ACCOUNT_ENCRYPTION_KEY = "test-payment-account-encryption-key-123456";
    const queries: string[] = [];
    const queryRunner = {
      query: jest.fn(async (sql: string) => {
        queries.push(sql);
        if (sql.includes('company_payment_account_id AS "id"')) {
          return [{
            id: "account-1",
            companyId: "company-1",
            type: "BANK_ACCOUNT",
            institutionName: "BCP",
            accountNumber: "1912345678901",
          }];
        }
        return [];
      }),
    };

    await new HardenCompanyTreasuryAccounts20260921100000().up(queryRunner as any);

    const sql = queries.join("\n");
    expect(sql).toContain("sensitive_identifier_encrypted");
    expect(sql).toContain("ux_company_payment_accounts_default_scope");
    expect(sql).not.toMatch(/DELETE\s+FROM/i);
    expect(queryRunner.query).toHaveBeenCalledWith(
      expect.stringContaining("account_number = NULL"),
      expect.arrayContaining([expect.stringMatching(/^v1:/), expect.any(String), "account-1"]),
    );
  });
});
