import { CurrencyType } from "src/modules/payments/domain/value-objects/currency-type";
import { SupplierPaymentDestination } from "./supplier-payment-destination";

describe("SupplierPaymentDestination", () => {
  const base = {
    supplierId: "supplier-1", methodId: "method-1", currency: CurrencyType.PEN,
    name: "Cuenta BCP", type: "BANK_ACCOUNT" as const, institutionName: "BCP", accountNumber: "12345678",
  };

  it("masks sensitive identifiers and preserves only the suffix in its presentation", () => {
    const destination = SupplierPaymentDestination.create(base);
    expect(destination.maskedLabel).toBe("Cuenta BCP ****5678");
    expect(destination.accountNumber).toBe("12345678");
  });

  it("rejects a destination incompatible with its required data", () => {
    expect(() => SupplierPaymentDestination.create({ ...base, type: "DIGITAL_WALLET", institutionName: null, providerName: "Yape" })).toThrow("identificador numérico");
  });

  it("blocks a reviewed destination from becoming default", () => {
    expect(() => SupplierPaymentDestination.create({ ...base, requiresManualReview: true, isDefault: true })).toThrow("inactivo o en revisión");
  });
});
