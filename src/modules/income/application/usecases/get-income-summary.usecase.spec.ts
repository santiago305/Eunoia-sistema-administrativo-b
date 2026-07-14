import { GetIncomeSummaryUsecase } from "./get-income-summary.usecase";
import { IncomeQueryRepository } from "../../domain/ports/income-query.repository";

describe("GetIncomeSummaryUsecase", () => {
  it("delegates normalized filters to the income query repository", async () => {
    const summary = {
      totalCollected: 1200,
      totalPending: 300,
      ordersPaid: 2,
      ordersPending: 1,
      byMethod: [{ method: "Yape", amount: 1200, count: 2 }],
      byAccount: [{ accountId: "account-1", label: "BCP", amount: 1200, count: 2 }],
    };
    const repo: jest.Mocked<IncomeQueryRepository> = {
      list: jest.fn(),
      getSummary: jest.fn().mockResolvedValue(summary),
    };
    const usecase = new GetIncomeSummaryUsecase(repo);

    await expect(usecase.execute({ hasEvidence: "true" as any })).resolves.toEqual(summary);

    expect(repo.getSummary).toHaveBeenCalledWith({
      from: undefined,
      to: undefined,
      method: undefined,
      companyPaymentAccountId: undefined,
      saleOrderId: undefined,
      client: undefined,
      q: undefined,
      hasEvidence: true,
      page: 1,
      limit: 20,
    });
  });
});
