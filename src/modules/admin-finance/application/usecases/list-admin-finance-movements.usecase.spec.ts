import { ListAdminFinanceMovementsUsecase } from "./list-admin-finance-movements.usecase";
import { AdminFinanceQueryRepository } from "../../domain/ports/admin-finance-query.repository";

describe("ListAdminFinanceMovementsUsecase", () => {
  it("returns normalized income and expense movements with pagination defaults", async () => {
    const response = {
      items: [
        {
          type: "INCOME" as const,
          source: "SALE_ORDER" as const,
          sourceId: "sale-1",
          amount: 100,
          currency: "PEN",
          status: "COLLECTED",
          date: "2026-07-10T00:00:00.000Z",
          description: "Pedido F001-10",
        },
      ],
      total: 1,
    };
    const repo: AdminFinanceQueryRepository = {
      getSummary: jest.fn(),
      listMovements: jest.fn().mockResolvedValue(response),
    };
    const usecase = new ListAdminFinanceMovementsUsecase(repo);

    await expect(usecase.execute({ type: "INCOME" })).resolves.toEqual(response);

    expect(repo.listMovements).toHaveBeenCalledWith({
      from: undefined,
      to: undefined,
      type: "INCOME",
      status: undefined,
      q: undefined,
      page: 1,
      limit: 50,
    });
  });
});
