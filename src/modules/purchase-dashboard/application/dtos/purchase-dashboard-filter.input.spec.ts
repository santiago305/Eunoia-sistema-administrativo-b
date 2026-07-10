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
      supplierIds: ["supplier-1"],
      purchaseType: "SERVICE",
      purchaseTypes: ["SERVICE"],
      status: "RECEIVED",
      paymentStatus: "PARTIAL",
      paymentStatuses: ["PARTIAL"],
      userId: "user-1",
      userIds: ["user-1"],
      warehouseId: "warehouse-1",
      warehouseIds: ["warehouse-1"],
      paymentMethodId: "method-1",
      paymentMethodIds: ["method-1"],
      companyPaymentAccountId: "account-1",
      companyPaymentAccountIds: ["account-1"],
      limit: undefined,
      from: undefined,
      to: undefined,
    });
  });

  it("normalizes repeated dashboard filter params into unique arrays", () => {
    const filters = normalizePurchaseDashboardFilters({
      supplierId: "supplier-1",
      supplierIds: ["supplier-1", "supplier-2"],
      purchaseTypes: ["SERVICE", "RAW_MATERIAL"],
      paymentStatuses: ["PENDING", "OVERDUE", "PENDING"],
      userIds: ["user-1"],
      warehouseIds: ["warehouse-1"],
      paymentMethodIds: ["method-1"],
      companyPaymentAccountIds: ["account-1"],
    });

    expect(filters.supplierIds).toEqual(["supplier-1", "supplier-2"]);
    expect(filters.purchaseTypes).toEqual(["SERVICE", "RAW_MATERIAL"]);
    expect(filters.paymentStatuses).toEqual(["PENDING", "OVERDUE"]);
    expect(filters.userIds).toEqual(["user-1"]);
    expect(filters.warehouseIds).toEqual(["warehouse-1"]);
    expect(filters.paymentMethodIds).toEqual(["method-1"]);
    expect(filters.companyPaymentAccountIds).toEqual(["account-1"]);
  });
});
