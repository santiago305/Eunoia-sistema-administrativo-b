import { PaymentFinancialPolicy, PaymentFinancialPolicyError } from "./payment-financial-policy";

const method = (overrides: Partial<Parameters<typeof PaymentFinancialPolicy.validate>[0]["method"]> = {}) => ({
  code: "BANK_TRANSFER",
  isActive: true,
  requiresSourceAccount: true,
  requiresDestination: true,
  requiresOperationReference: true,
  requiresVoucher: true,
  ...overrides,
});

const account = (overrides: Partial<NonNullable<Parameters<typeof PaymentFinancialPolicy.validate>[0]["account"]>> = {}) => ({
  id: "account-1",
  isActive: true,
  currency: "PEN",
  usage: "OUTFLOW",
  type: "BANK_ACCOUNT" as const,
  ...overrides,
});

const destination = (overrides: Partial<NonNullable<Parameters<typeof PaymentFinancialPolicy.validate>[0]["destination"]>> = {}) => ({
  id: "destination-1",
  isActive: true,
  requiresManualReview: false,
  currency: "PEN",
  methodId: "method-1",
  ...overrides,
});

const validInput = () => ({
  method: method(),
  account: account(),
  destination: destination(),
  paymentMethodId: "method-1",
  currency: "PEN",
  operationNumber: "OP-123",
  hasEvidence: true,
  validateEvidence: true,
});

describe("PaymentFinancialPolicy", () => {
  it("accepts a compatible transfer payment", () => {
    expect(() => PaymentFinancialPolicy.validate(validInput())).not.toThrow();
  });

  it("requires a source account when the method needs one", () => {
    expect(() => PaymentFinancialPolicy.validate({
      ...validInput(),
      account: null,
    })).toThrowError(new PaymentFinancialPolicyError(
      "SOURCE_ACCOUNT_REQUIRED",
      "Debe seleccionar una cuenta de origen",
    ));
  });

  it("rejects an account incompatible with the method", () => {
    expect(() => PaymentFinancialPolicy.validate({
      ...validInput(),
      method: method({ code: "CARD", requiresDestination: false }),
      account: account({ type: "BANK_ACCOUNT" }),
      destination: null,
      operationNumber: "AUTH-1",
    })).toThrow("La cuenta de origen no es compatible");
  });

  it("rejects an unconfirmed supplier destination", () => {
    expect(() => PaymentFinancialPolicy.validate({
      ...validInput(),
      destination: destination({ requiresManualReview: true }),
    })).toThrow("destino del proveedor");
  });

  it("requires evidence only when validation is requested", () => {
    expect(() => PaymentFinancialPolicy.validate({
      ...validInput(),
      hasEvidence: false,
      validateEvidence: false,
    })).not.toThrow();

    expect(() => PaymentFinancialPolicy.validate({
      ...validInput(),
      hasEvidence: false,
      validateEvidence: true,
    })).toThrow("evidencia requerida");
  });

  it("keeps the treasury compatibility matrix in one policy boundary", () => {
    expect(PaymentFinancialPolicy.compatibleAccountTypes("CARD")).toEqual(["CREDIT_CARD"]);
    expect(PaymentFinancialPolicy.compatibleAccountTypes("BANK_TRANSFER")).toEqual(["BANK_ACCOUNT"]);
  });

  it.each([
    ["CASH", "CASH"],
    ["BANK_TRANSFER", "BANK_ACCOUNT"],
    ["BANK_DEPOSIT", "BANK_ACCOUNT"],
    ["CARD", "CREDIT_CARD"],
    ["DIGITAL_WALLET", "DIGITAL_WALLET"],
    ["CHECK", "BANK_ACCOUNT"],
  ] as const)("maps %s to its treasury account type", (methodCode, accountType) => {
    expect(PaymentFinancialPolicy.compatibleAccountTypes(methodCode)).toContain(accountType);
  });

  it.each(["PEN", "USD"] as const)("accepts a valid %s payment currency", (currency) => {
    expect(() => PaymentFinancialPolicy.validate({
      ...validInput(),
      currency,
      account: account({ currency }),
      destination: destination({ currency }),
    })).not.toThrow();
  });
});
