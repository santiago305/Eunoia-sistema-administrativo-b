import { QueryRunner } from "typeorm";
import { RetireSalePaymentBankAccount20260921210000 } from "./20260921210000-retire-sale-payment-bank-account";

describe("RetireSalePaymentBankAccount20260921210000", () => {
  it("checks unmapped legacy receivers before dropping the column", async () => {
    const query = jest.fn()
      .mockResolvedValueOnce([{ count: 0 }])
      .mockResolvedValueOnce(undefined);
    const migration = new RetireSalePaymentBankAccount20260921210000();

    await migration.up({ query } as unknown as QueryRunner);

    expect(query.mock.calls[0][0]).toContain("bank_account_id IS NOT NULL");
    expect(query.mock.calls[0][0]).toContain("company_payment_account_id IS NULL");
    expect(query.mock.calls[1][0]).toContain("DROP COLUMN IF EXISTS bank_account_id");
  });

  it("stops when a legacy receiver is not reconciled", async () => {
    const query = jest.fn().mockResolvedValueOnce([{ count: 1 }]);
    const migration = new RetireSalePaymentBankAccount20260921210000();

    await expect(migration.up({ query } as unknown as QueryRunner)).rejects.toThrow(
      "cobros sin cuenta receptora normalizada",
    );
    expect(query).toHaveBeenCalledTimes(1);
  });
});
