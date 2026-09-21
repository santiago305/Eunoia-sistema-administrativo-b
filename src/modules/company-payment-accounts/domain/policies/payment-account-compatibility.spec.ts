import {
  getCompatibleCompanyPaymentAccountTypes,
  isCompanyPaymentAccountCompatible,
} from "./payment-account-compatibility";

describe("payment account compatibility", () => {
  it("implements the financial method and treasury account matrix", () => {
    expect(getCompatibleCompanyPaymentAccountTypes("CASH")).toEqual(["CASH"]);
    expect(getCompatibleCompanyPaymentAccountTypes("BANK_TRANSFER")).toEqual(["BANK_ACCOUNT"]);
    expect(getCompatibleCompanyPaymentAccountTypes("BANK_DEPOSIT")).toEqual(["BANK_ACCOUNT", "CASH"]);
    expect(getCompatibleCompanyPaymentAccountTypes("CARD")).toEqual(["CREDIT_CARD"]);
    expect(getCompatibleCompanyPaymentAccountTypes("DIGITAL_WALLET")).toEqual(["DIGITAL_WALLET"]);
    expect(getCompatibleCompanyPaymentAccountTypes("CHECK")).toEqual(["BANK_ACCOUNT"]);
  });

  it("leaves OTHER and unknown methods configurable", () => {
    expect(isCompanyPaymentAccountCompatible("OTHER", "CASH")).toBe(true);
    expect(isCompanyPaymentAccountCompatible("CUSTOM", "BANK_ACCOUNT")).toBe(true);
  });
});
