import { GetAdminFinanceSummaryUsecase } from "./get-admin-finance-summary.usecase";
import { ADMIN_FINANCE_QUERY_REPOSITORY, AdminFinanceQueryRepository } from "../../domain/ports/admin-finance-query.repository";

describe("GetAdminFinanceSummaryUsecase", () => {
  it("delegates normalized date filters and returns consolidated money flow", async () => {
    const summary = {
      income: { collected: 120, pending: 30 },
      expenses: { paid: 80, pending: 50, overdue: 10, scheduled: 20 },
      net: { collectedMinusPaid: 40, projectedAfterPending: -40 },
    };
    const repo: AdminFinanceQueryRepository = {
      getSummary: jest.fn().mockResolvedValue(summary),
      listMovements: jest.fn(),
    };
    const usecase = new GetAdminFinanceSummaryUsecase(repo);

    await expect(
      usecase.execute({ from: "2026-07-01", to: "2026-07-31" }),
    ).resolves.toEqual(summary);

    expect(repo.getSummary).toHaveBeenCalledWith({
      from: "2026-07-01",
      to: "2026-07-31",
      type: undefined,
      status: undefined,
      q: undefined,
    });
    expect(ADMIN_FINANCE_QUERY_REPOSITORY).toBe("ADMIN_FINANCE_QUERY_REPOSITORY");
  });
});
