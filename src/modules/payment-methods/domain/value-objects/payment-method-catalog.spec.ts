import {
  getPaymentMethodDefinition,
  normalizePaymentMethodCode,
  PAYMENT_METHOD_CODES,
} from "./payment-method-catalog";

describe("payment method catalog", () => {
  it("exposes only stable operational method codes", () => {
    expect(PAYMENT_METHOD_CODES).toEqual([
      "CASH",
      "BANK_TRANSFER",
      "BANK_DEPOSIT",
      "CARD",
      "DIGITAL_WALLET",
      "CHECK",
      "OTHER",
    ]);
  });

  it("maps legacy brands to their method category", () => {
    expect(normalizePaymentMethodCode(undefined, "BCP")).toBe("BANK_TRANSFER");
    expect(normalizePaymentMethodCode(undefined, "YAPE")).toBe("DIGITAL_WALLET");
    expect(normalizePaymentMethodCode("BANK_TRANSFER")).toBe("BANK_TRANSFER");
  });

  it("defines cash without a voucher or operation reference by default", () => {
    expect(getPaymentMethodDefinition("CASH")).toMatchObject({
      requiresVoucher: false,
      requiresOperationReference: false,
      requiresDestination: false,
    });
  });
});
