import { PurchaseType } from "src/modules/purchases/domain/value-objects/purchase-type";
import { RecurringPurchaseTemplate } from "../../domain/entity/recurring-purchase-template";
import { ListRecurringPurchasesUsecase } from "./list-recurring-purchases.usecase";

const template = RecurringPurchaseTemplate.create({
  recurringPurchaseTemplateId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  supplierId: "11111111-1111-4111-8111-111111111111",
  name: "Hosting mensual",
  frequency: "MONTHLY",
  purchaseType: PurchaseType.SUBSCRIPTION,
  currency: "PEN",
  amount: 120,
  startDate: new Date("2026-06-10T00:00:00.000Z"),
  nextDueDate: new Date("2026-07-10T00:00:00.000Z"),
});

describe("ListRecurringPurchasesUsecase", () => {
  it("uses 25 as default limit and forwards smart filters", async () => {
    const repo = {
      list: jest.fn(async () => ({
        items: [template],
        total: 1,
        page: 1,
        limit: 25,
      })),
    };
    const usecase = new ListRecurringPurchasesUsecase(repo as any);

    await usecase.execute({
      q: "hosting",
      filters: [
        {
          field: "supplierId",
          operator: "in",
          values: ["11111111-1111-4111-8111-111111111111"],
        },
      ],
    });

    expect(repo.list).toHaveBeenCalledWith({
      q: "hosting",
      filters: [
        {
          field: "supplierId",
          operator: "in",
          values: ["11111111-1111-4111-8111-111111111111"],
        },
      ],
      page: 1,
      limit: 25,
    });
  });
});
