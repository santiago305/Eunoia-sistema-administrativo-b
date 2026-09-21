import { CurrencyType } from "src/modules/payments/domain/value-objects/currency-type";
import { CompanyPaymentAccount } from "./company-payment-account";

const base = {
  companyId: "company-1",
  name: "Cuenta principal",
  currency: CurrencyType.PEN,
};

describe("CompanyPaymentAccount", () => {
  it("rejects an incomplete bank account", () => {
    expect(() => CompanyPaymentAccount.create({
      ...base,
      type: "BANK_ACCOUNT",
      institutionName: "BCP",
    })).toThrow("numero de cuenta o CCI");
  });

  it("rejects incompatible fields and clears them for cash", () => {
    const account = CompanyPaymentAccount.create({
      ...base,
      type: "CASH",
      institutionName: "BCP",
      accountNumber: "123456",
    });

    expect(account.institutionName).toBeNull();
    expect(account.accountNumber).toBeNull();
  });

  it("requires four numeric digits for a card", () => {
    expect(() => CompanyPaymentAccount.create({
      ...base,
      type: "CREDIT_CARD",
      cardLastFour: "12A4",
    })).toThrow("ultimos cuatro digitos");
  });

  it("requires provider and identifier for a wallet", () => {
    expect(() => CompanyPaymentAccount.create({
      ...base,
      type: "DIGITAL_WALLET",
      walletProvider: "Yape",
    })).toThrow("proveedor");
  });

  it("does not allow an inactive default account", () => {
    expect(() => CompanyPaymentAccount.create({
      ...base,
      type: "CASH",
      isActive: false,
      isDefault: true,
    })).toThrow("inactiva");
  });
});
