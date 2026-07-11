import { CurrencyType } from "src/modules/payments/domain/value-objects/currency-type";
import { RecurringPurchasesController } from "./recurring-purchases.controller";

describe("RecurringPurchasesController", () => {
  const buildController = () => {
    const registerRecurringPayment = {
      execute: jest.fn(async () => ({
        type: "success",
        paymentId: "payment-1",
        purchaseId: "purchase-1",
        accountPayableId: "payable-1",
      })),
    };
    const controller = new RecurringPurchasesController(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      registerRecurringPayment as any,
    );

    return { controller, registerRecurringPayment };
  };

  it("registers a payment for a recurring purchase", async () => {
    const { controller, registerRecurringPayment } = buildController();

    const result = await controller.registerPayment(
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      {
        method: "Transferencia",
        date: "2026-07-10",
        currency: CurrencyType.PEN,
        amount: 120,
        operationNumber: "OP-123",
        paymentEvidenceFileId: "77777777-7777-4777-8777-777777777777",
      },
      { id: "22222222-2222-4222-8222-222222222222" },
    );

    expect(result).toEqual(
      expect.objectContaining({
        type: "success",
        paymentId: "payment-1",
      }),
    );
    expect(registerRecurringPayment.execute).toHaveBeenCalledWith({
      templateId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      userId: "22222222-2222-4222-8222-222222222222",
      payment: {
        method: "Transferencia",
        date: "2026-07-10",
        currency: CurrencyType.PEN,
        amount: 120,
        operationNumber: "OP-123",
        paymentEvidenceFileId: "77777777-7777-4777-8777-777777777777",
      },
    });
  });
});
