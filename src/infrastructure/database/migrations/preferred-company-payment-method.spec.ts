import { AddPreferredCompanyPaymentMethod20260928120000 } from "./20260928120000-add-preferred-company-payment-method";

describe("AddPreferredCompanyPaymentMethod20260928120000", () => {
  it("creates the preferred relation and migrates imported advances", async () => {
    const queries: string[] = [];
    const queryRunner = {
      query: jest.fn(async (sql: string) => {
        queries.push(sql);
        return [];
      }),
    };

    await new AddPreferredCompanyPaymentMethod20260928120000().up(
      queryRunner as any,
    );

    const sql = queries.join("\n");
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS is_default");
    expect(sql).toContain("ux_company_methods_default_company");
    expect(sql).toContain("trg_protect_company_bank_transfer_method");
    expect(sql).toContain("UPDATE sale_payments payment");
    expect(sql).toContain("payment_method_id = method.method_id");
    expect(sql).toContain("company_payment_account_id = NULL");
    expect(sql).toContain("import_adelanto");
  });
});
