import {
  resolveCompanyMethodRequiresVoucher,
  resolveRequiresVoucher,
  toCompanyMethodEvidencePolicy,
} from "./payment-method-voucher-policy";

describe("resolveRequiresVoucher", () => {
  it("defaults voucher requirement from method name and respects explicit overrides", () => {
    expect(resolveRequiresVoucher("EFECTIVO")).toBe(false);
    expect(resolveRequiresVoucher("Transferencia")).toBe(true);
    expect(resolveRequiresVoucher("Tarjeta", false)).toBe(false);
    expect(resolveRequiresVoucher("Efectivo", true)).toBe(true);
  });
});

describe("company payment method evidence policy", () => {
  it("resolves the effective requirement from one explicit company policy", () => {
    expect(resolveCompanyMethodRequiresVoucher(true, "INHERIT")).toBe(true);
    expect(resolveCompanyMethodRequiresVoucher(false, "INHERIT")).toBe(false);
    expect(resolveCompanyMethodRequiresVoucher(false, "REQUIRED")).toBe(true);
    expect(resolveCompanyMethodRequiresVoucher(true, "OPTIONAL")).toBe(false);
  });

  it("maps the legacy boolean only at the API compatibility boundary", () => {
    expect(toCompanyMethodEvidencePolicy(undefined, true)).toBe("REQUIRED");
    expect(toCompanyMethodEvidencePolicy(undefined, false)).toBe("OPTIONAL");
    expect(toCompanyMethodEvidencePolicy()).toBe("INHERIT");
  });
});
