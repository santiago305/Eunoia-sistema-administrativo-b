import { GetPurchaseDashboardSummaryUsecase } from "./get-purchase-dashboard-summary.usecase";

describe("GetPurchaseDashboardSummaryUsecase", () => {
  it("asks the dashboard repository for summary totals using normalized filters", async () => {
    const repo = {
      getSummary: jest.fn().mockResolvedValue({
        totalPurchased: 1200,
        totalPaid: 700,
        pending: 500,
        overdue: 200,
        drafts: 2,
        toApprove: 3,
        paymentsToApprove: 4,
        received: 5,
      }),
    };
    const usecase = new GetPurchaseDashboardSummaryUsecase(repo as any);

    const result = await usecase.execute({
      from: "2026-06-01",
      to: "2026-06-30",
      supplierId: "supplier-1",
      supplierIds: ["supplier-1"],
      purchaseType: "SERVICE",
      purchaseTypes: ["SERVICE"],
      status: undefined,
      paymentStatus: "PARTIAL",
      paymentStatuses: ["PARTIAL"],
      userId: undefined,
      userIds: undefined,
      warehouseId: "warehouse-1",
      warehouseIds: ["warehouse-1"],
      paymentMethodId: "method-1",
      paymentMethodIds: ["method-1"],
      companyPaymentAccountId: "account-1",
      companyPaymentAccountIds: ["account-1"],
      limit: undefined,
    });

    expect(repo.getSummary).toHaveBeenCalledWith({
      from: new Date("2026-06-01T00:00:00.000Z"),
      to: new Date("2026-06-30T23:59:59.999Z"),
      supplierId: "supplier-1",
      purchaseType: "SERVICE",
      paymentStatus: "PARTIAL",
      warehouseId: "warehouse-1",
      paymentMethodId: "method-1",
      companyPaymentAccountId: "account-1",
    });
    expect(result).toEqual({
      totalPurchased: 1200,
      totalPaid: 700,
      pending: 500,
      overdue: 200,
      drafts: 2,
      toApprove: 3,
      paymentsToApprove: 4,
      received: 5,
    });
  });
});
