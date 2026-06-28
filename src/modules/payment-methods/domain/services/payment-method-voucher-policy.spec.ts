import { resolveRequiresVoucher } from "./payment-method-voucher-policy";

describe("resolveRequiresVoucher", () => {
  it("defaults voucher requirement from method name and respects explicit overrides", () => {
    expect(resolveRequiresVoucher("EFECTIVO")).toBe(false);
    expect(resolveRequiresVoucher("Transferencia")).toBe(true);
    expect(resolveRequiresVoucher("Tarjeta", false)).toBe(false);
    expect(resolveRequiresVoucher("Efectivo", true)).toBe(true);
  });
});
