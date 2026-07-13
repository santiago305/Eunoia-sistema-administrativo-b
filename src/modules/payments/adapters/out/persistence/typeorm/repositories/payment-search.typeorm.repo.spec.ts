import { PaymentSearchTypeormRepository } from "./payment-search.typeorm.repo";

describe("PaymentSearchTypeormRepository", () => {
  it("loads listing state and payment catalogs", async () => {
    const storage = {
      touchRecentSearch: jest.fn(),
      listState: jest.fn().mockResolvedValue({
        recent: [
          {
            recentId: "recent-1",
            snapshot: { q: "bcp", filters: [] },
            lastUsedAt: new Date("2026-07-13T08:00:00.000Z"),
          },
        ],
        metrics: [
          {
            metricId: "metric-1",
            name: "Guardada",
            snapshot: { filters: [] },
            updatedAt: new Date("2026-07-13T09:00:00.000Z"),
          },
        ],
      }),
      createMetric: jest.fn(),
      deleteMetric: jest.fn(),
    };
    const paymentMethodRepo = {
      find: jest.fn().mockResolvedValue([
        { id: "method-2", name: "Yape", isActive: true },
        { id: "method-1", name: "Transferencia", isActive: true },
      ]),
    };
    const companyPaymentAccountRepo = {
      find: jest.fn().mockResolvedValue([
        {
          id: "account-1",
          name: "Cuenta principal",
          bankName: "BCP",
          accountLastFour: "1234",
          isActive: true,
        },
      ]),
    };
    const repo = new PaymentSearchTypeormRepository(
      storage as any,
      paymentMethodRepo as any,
      companyPaymentAccountRepo as any,
    );

    const state = await repo.listState({ userId: "user-1", tableKey: "payments" });

    expect(storage.listState).toHaveBeenCalledWith({ userId: "user-1", tableKey: "payments" });
    expect(paymentMethodRepo.find).toHaveBeenCalledWith({ where: { isActive: true } });
    expect(companyPaymentAccountRepo.find).toHaveBeenCalledWith({ where: { isActive: true } });
    expect(state.paymentMethods).toEqual([
      { paymentMethodId: "method-1", label: "Transferencia" },
      { paymentMethodId: "method-2", label: "Yape" },
    ]);
    expect(state.companyPaymentAccounts).toEqual([
      { companyPaymentAccountId: "account-1", label: "BCP - Cuenta principal ****1234" },
    ]);
  });

  it("delegates metric creation and deletion to listing-search storage", async () => {
    const storage = {
      touchRecentSearch: jest.fn(),
      listState: jest.fn(),
      createMetric: jest.fn().mockResolvedValue({
        metricId: "metric-1",
        name: "Pagos",
        snapshot: { filters: [] },
        updatedAt: new Date("2026-07-13T09:00:00.000Z"),
      }),
      deleteMetric: jest.fn().mockResolvedValue(true),
    };
    const repo = new PaymentSearchTypeormRepository(storage as any, {} as any, {} as any);

    await repo.createMetric({
      userId: "user-1",
      tableKey: "payments",
      name: "Pagos",
      snapshot: { filters: [] },
    });
    const deleted = await repo.deleteMetric({
      userId: "user-1",
      tableKey: "payments",
      metricId: "metric-1",
    });

    expect(storage.createMetric).toHaveBeenCalledWith({
      userId: "user-1",
      tableKey: "payments",
      name: "Pagos",
      snapshot: { filters: [] },
    });
    expect(deleted).toBe(true);
  });
});
