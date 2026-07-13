import { CurrencyType } from "src/modules/payments/domain/value-objects/currency-type";
import { ListAccountPayablesUsecase } from "./list-account-payables.usecase";

describe("ListAccountPayablesUsecase", () => {
  it("passes advanced filters to the account payable repository", async () => {
    const repo = {
      list: jest.fn().mockResolvedValue({ items: [], total: 0 }),
    };
    const usecase = new ListAccountPayablesUsecase(repo as any);

    await usecase.execute({
      q: "factura julio",
      statuses: ["PENDING", "OVERDUE"],
      purchaseId: "11111111-1111-4111-8111-111111111111",
      supplierId: "22222222-2222-4222-8222-222222222222",
      currency: CurrencyType.PEN,
      dueFrom: "2026-07-01",
      dueTo: "2026-07-31",
      amountPendingMin: 100,
      amountPendingMax: 500,
      page: 2,
      limit: 15,
    });

    expect(repo.list).toHaveBeenCalledWith({
      q: "factura julio",
      statuses: ["PENDING", "OVERDUE"],
      purchaseId: "11111111-1111-4111-8111-111111111111",
      supplierId: "22222222-2222-4222-8222-222222222222",
      currency: CurrencyType.PEN,
      dueFrom: "2026-07-01",
      dueTo: "2026-07-31",
      amountPendingMin: 100,
      amountPendingMax: 500,
      page: 2,
      limit: 15,
    });
  });
});
