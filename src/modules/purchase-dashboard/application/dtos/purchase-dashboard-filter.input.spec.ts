import { normalizePurchaseDashboardFilters } from "./purchase-dashboard-filter.input";

describe("normalizePurchaseDashboardFilters", () => {
  it("normalizes date bounds and numeric HTTP limit", () => {
    const filters = normalizePurchaseDashboardFilters({
      from: "2026-07-09",
      to: "2026-07-09",
      limit: "20",
    });

    expect(filters.from).toEqual(new Date("2026-07-09T00:00:00.000Z"));
    expect(filters.to).toEqual(new Date("2026-07-09T23:59:59.999Z"));
    expect(filters.limit).toBe(20);
  });

  it("clamps limit to the supported backend range when provided", () => {
    expect(normalizePurchaseDashboardFilters({ limit: "0" }).limit).toBe(1);
    expect(normalizePurchaseDashboardFilters({ limit: "99" }).limit).toBe(50);
    expect(normalizePurchaseDashboardFilters({ limit: "abc" }).limit).toBeUndefined();
  });

  it("preserves every dashboard filter param while leaving omitted limit undefined", () => {
    const filters = normalizePurchaseDashboardFilters({
      supplierId: "supplier-1",
      purchaseType: "SERVICE",
      status: "RECEIVED",
      paymentStatus: "PARTIAL",
      userId: "user-1",
      warehouseId: "warehouse-1",
      paymentMethodId: "method-1",
      companyPaymentAccountId: "account-1",
    });

    expect(filters).toEqual({
      supplierId: "supplier-1",
      purchaseType: "SERVICE",
      status: "RECEIVED",
      paymentStatus: "PARTIAL",
      userId: "user-1",
      warehouseId: "warehouse-1",
      paymentMethodId: "method-1",
      companyPaymentAccountId: "account-1",
      limit: undefined,
      from: undefined,
      to: undefined,
    });
  });
});
