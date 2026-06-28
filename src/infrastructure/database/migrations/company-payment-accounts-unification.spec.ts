import { QueryRunner } from "typeorm";
import { UnifySalePaymentsCompanyPaymentAccounts20260628000000 } from "./20260628000000-unify-sale-payments-company-payment-accounts";

describe("UnifySalePaymentsCompanyPaymentAccounts20260628000000", () => {
  it("repoints sale payment account references to company payment accounts", async () => {
    const queries: string[] = [];
    const queryRunner = {
      query: jest.fn(async (query: string) => {
        queries.push(query);
      }),
    } as unknown as QueryRunner;

    await new UnifySalePaymentsCompanyPaymentAccounts20260628000000().up(queryRunner);

    const sql = queries.join("\n");
    expect(sql).toContain("company_payment_accounts");
    expect(sql).toContain("sale_payments");
    expect(sql).toContain("DROP CONSTRAINT");
    expect(sql).toContain("REFERENCES company_payment_accounts(company_payment_account_id)");
    expect(sql).toContain("UPDATE sale_payments sp");
  });
});
