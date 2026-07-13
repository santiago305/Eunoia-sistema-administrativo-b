import { CompanyPaymentAccount } from "../../domain/entity/company-payment-account";
import { CompanyPaymentAccountOutputMapper } from "./company-payment-account-output.mapper";
import { CurrencyType } from "src/modules/payments/domain/value-objects/currency-type";

const makeAccount = () =>
  CompanyPaymentAccount.create({
    companyPaymentAccountId: "account-1",
    companyId: "company-1",
    type: "BANK_ACCOUNT",
    name: "BCP Empresa",
    bankName: "BCP",
    accountNumber: "1912345678901",
    currency: CurrencyType.PEN,
    isActive: true,
    isDefault: true,
  });

describe("CompanyPaymentAccountOutputMapper", () => {
  it("hides sensitive account numbers by default", () => {
    const output = CompanyPaymentAccountOutputMapper.toOutput(makeAccount());

    expect(output.accountNumber).toBeNull();
    expect(output.accountLastFour).toBe("8901");
    expect(output.maskedLabel).toBe("BCP Empresa ****8901");
  });

  it("includes sensitive account numbers only when explicitly requested", () => {
    const output = CompanyPaymentAccountOutputMapper.toOutput(makeAccount(), {
      includeSensitive: true,
    });

    expect(output.accountNumber).toBe("1912345678901");
  });
});
