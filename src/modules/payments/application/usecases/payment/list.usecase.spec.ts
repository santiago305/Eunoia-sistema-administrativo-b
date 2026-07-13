import { ListPaymentsUsecase } from "./list.usecase";
import { CurrencyType } from "src/modules/payments/domain/value-objects/currency-type";
import { PayDocType } from "src/modules/payments/domain/value-objects/pay-doc-type";

describe("ListPaymentsUsecase", () => {
  it("passes status filter to the payment repository", async () => {
    const repo = {
      list: jest.fn().mockResolvedValue({ items: [], total: 0 }),
    };
    const usecase = new ListPaymentsUsecase(repo as any);

    await usecase.execute({
      page: 2,
      limit: 15,
      status: "PENDING_APPROVAL",
    });

    expect(repo.list).toHaveBeenCalledWith({
      page: 2,
      limit: 15,
      status: "PENDING_APPROVAL",
    });
  });

  it("passes scheduled status filter to the payment repository", async () => {
    const repo = {
      list: jest.fn().mockResolvedValue({ items: [], total: 0 }),
    };
    const usecase = new ListPaymentsUsecase(repo as any);

    await usecase.execute({
      status: "SCHEDULED",
    });

    expect(repo.list).toHaveBeenCalledWith({
      page: 1,
      limit: 10,
      status: "SCHEDULED",
    });
  });

  it("passes advanced payment filters to the payment repository", async () => {
    const repo = {
      list: jest.fn().mockResolvedValue({ items: [], total: 0 }),
    };
    const usecase = new ListPaymentsUsecase(repo as any);

    await usecase.execute({
      q: "op-900 banco",
      statuses: ["SCHEDULED", "APPROVED"],
      accountPayableId: "11111111-1111-1111-1111-111111111111",
      paymentMethodId: "22222222-2222-2222-2222-222222222222",
      paymentMethodIds: ["33333333-3333-3333-3333-333333333333"],
      companyPaymentAccountId: "44444444-4444-4444-4444-444444444444",
      companyPaymentAccountIds: ["55555555-5555-5555-5555-555555555555"],
      fromDocumentType: PayDocType.PURCHASE,
      currency: CurrencyType.PEN,
      dateFrom: "2026-01-01",
      dateTo: "2026-01-31",
      scheduledFrom: "2026-02-01",
      scheduledTo: "2026-02-28",
      paidFrom: "2026-03-01",
      paidTo: "2026-03-31",
      amountMin: 100,
      amountMax: 500,
      requestedByUserId: "66666666-6666-6666-6666-666666666666",
      approvedByUserId: "77777777-7777-7777-7777-777777777777",
      hasEvidence: true,
      page: 3,
      limit: 25,
    });

    expect(repo.list).toHaveBeenCalledWith({
      q: "op-900 banco",
      statuses: ["SCHEDULED", "APPROVED"],
      accountPayableId: "11111111-1111-1111-1111-111111111111",
      paymentMethodId: "22222222-2222-2222-2222-222222222222",
      paymentMethodIds: ["33333333-3333-3333-3333-333333333333"],
      companyPaymentAccountId: "44444444-4444-4444-4444-444444444444",
      companyPaymentAccountIds: ["55555555-5555-5555-5555-555555555555"],
      fromDocumentType: PayDocType.PURCHASE,
      currency: CurrencyType.PEN,
      dateFrom: "2026-01-01",
      dateTo: "2026-01-31",
      scheduledFrom: "2026-02-01",
      scheduledTo: "2026-02-28",
      paidFrom: "2026-03-01",
      paidTo: "2026-03-31",
      amountMin: 100,
      amountMax: 500,
      requestedByUserId: "66666666-6666-6666-6666-666666666666",
      approvedByUserId: "77777777-7777-7777-7777-777777777777",
      hasEvidence: true,
      page: 3,
      limit: 25,
    });
  });
});
