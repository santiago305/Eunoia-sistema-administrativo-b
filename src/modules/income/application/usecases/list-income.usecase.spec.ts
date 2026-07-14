import { ListIncomeUsecase } from "./list-income.usecase";
import { INCOME_QUERY_REPOSITORY, IncomeQueryRepository } from "../../domain/ports/income-query.repository";

describe("ListIncomeUsecase", () => {
  it("normalizes date, method and account filters before listing income", async () => {
    const repo: jest.Mocked<IncomeQueryRepository> = {
      list: jest.fn().mockResolvedValue({ items: [], total: 0 }),
      getSummary: jest.fn(),
    };
    const usecase = new ListIncomeUsecase(repo);

    await usecase.execute({
      from: "2026-07-01",
      to: "2026-07-14",
      method: "Transferencia",
      companyPaymentAccountId: "account-1",
      page: "2" as any,
      limit: "25" as any,
    });

    expect(repo.list).toHaveBeenCalledWith({
      from: "2026-07-01",
      to: "2026-07-14",
      method: "Transferencia",
      companyPaymentAccountId: "account-1",
      saleOrderId: undefined,
      client: undefined,
      q: undefined,
      hasEvidence: undefined,
      page: 2,
      limit: 25,
    });
  });

  it("exports the repository token used by the module provider", () => {
    expect(typeof INCOME_QUERY_REPOSITORY).toBe("symbol");
  });
});
