import { GetUpcomingPaymentsUsecase } from "./get-upcoming-payments.usecase";

describe("GetUpcomingPaymentsUsecase", () => {
  it("requests upcoming unpaid accounts with a safe default limit", async () => {
    const repo = {
      getUpcomingPayments: jest.fn().mockResolvedValue([
        {
          accountPayableId: "ap-1",
          purchaseId: "po-1",
          supplierId: "supplier-1",
          supplierName: null,
          dueDate: "2026-07-02",
          amountPending: 150,
          currency: "PEN",
          status: "PENDING",
        },
      ]),
    };
    const usecase = new GetUpcomingPaymentsUsecase(repo as any);

    const result = await usecase.execute({ to: "2026-07-31" });

    expect(repo.getUpcomingPayments).toHaveBeenCalledWith({
      to: new Date("2026-07-31T23:59:59.999Z"),
      limit: 10,
    });
    expect(result).toHaveLength(1);
  });
});
