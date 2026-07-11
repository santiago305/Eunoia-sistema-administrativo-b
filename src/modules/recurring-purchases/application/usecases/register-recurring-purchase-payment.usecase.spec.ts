import { NotFoundException } from "@nestjs/common";
import { CurrencyType } from "src/modules/payments/domain/value-objects/currency-type";
import { RecurringPurchaseTemplate } from "../../domain/entity/recurring-purchase-template";
import { RegisterRecurringPurchasePaymentUsecase } from "./register-recurring-purchase-payment.usecase";

const templateId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const purchaseId = "33333333-3333-4333-8333-333333333333";
const accountPayableId = "44444444-4444-4444-8444-444444444444";
const userId = "22222222-2222-4222-8222-222222222222";

const buildTemplate = (overrides: Partial<{
  lastGeneratedPeriodKey: string;
  lastGeneratedPurchaseId: string;
  lastGeneratedAccountPayableId: string;
}> = {}) =>
  RecurringPurchaseTemplate.create({
    recurringPurchaseTemplateId: templateId,
    supplierId: "11111111-1111-4111-8111-111111111111",
    name: "Hosting mensual",
    frequency: "MONTHLY",
    currency: "PEN",
    amount: 120,
    startDate: new Date("2026-06-10T00:00:00.000Z"),
    nextDueDate: new Date("2026-07-10T00:00:00.000Z"),
    createdByUserId: userId,
    ...overrides,
  });

describe("RegisterRecurringPurchasePaymentUsecase", () => {
  const buildDeps = (template = buildTemplate()) => {
    const templateRepo = {
      findById: jest.fn(async () => template),
    };
    const generateCurrentPayable = {
      execute: jest.fn(async () => ({
        generated: true,
        purchaseId,
        accountPayableId,
        template: buildTemplate({
          lastGeneratedPeriodKey: "2026-07",
          lastGeneratedPurchaseId: purchaseId,
          lastGeneratedAccountPayableId: accountPayableId,
        }),
      })),
    };
    const createPayment = {
      execute: jest.fn(async () => ({ type: "success", message: "Pago registrado con exito", paymentId: "payment-1" })),
    };
    const recalculateAccountPayable = {
      execute: jest.fn(async () => undefined),
    };
    const accessControlService = {
      userHasAllPermissions: jest.fn(async () => true),
    };

    const usecase = new RegisterRecurringPurchasePaymentUsecase(
      templateRepo as any,
      generateCurrentPayable as any,
      createPayment as any,
      recalculateAccountPayable as any,
      accessControlService as any,
    );

    return { usecase, templateRepo, generateCurrentPayable, createPayment, recalculateAccountPayable, accessControlService };
  };

  it("generates the period payable when needed and registers an approved payment with evidence", async () => {
    const { usecase, generateCurrentPayable, createPayment, recalculateAccountPayable, accessControlService } =
      buildDeps();

    const result = await usecase.execute({
      templateId,
      userId,
      payment: {
        method: "Transferencia",
        date: "2026-07-09",
        currency: CurrencyType.PEN,
        amount: 120,
        operationNumber: "OP-123",
        paymentEvidenceFileId: "77777777-7777-4777-8777-777777777777",
      },
    });

    expect(result).toEqual(
      expect.objectContaining({
        type: "success",
        paymentId: "payment-1",
        purchaseId,
        accountPayableId,
      }),
    );
    expect(generateCurrentPayable.execute).toHaveBeenCalledWith({
      templateId,
      generatedByUserId: userId,
      now: new Date("2026-07-10T00:00:00.000Z"),
    });
    expect(accessControlService.userHasAllPermissions).toHaveBeenCalledWith(userId, ["payments.approve"]);
    expect(createPayment.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        poId: purchaseId,
        accountPayableId,
        paymentEvidenceFileId: "77777777-7777-4777-8777-777777777777",
        paidByUserId: userId,
      }),
      purchaseId,
      expect.objectContaining({
        status: "APPROVED",
        requestedByUserId: userId,
        approvedByUserId: userId,
      }),
    );
    expect(recalculateAccountPayable.execute).toHaveBeenCalledWith({ accountPayableId });
  });

  it("reuses the existing period payable when it is already generated", async () => {
    const { usecase, generateCurrentPayable, createPayment } = buildDeps(
      buildTemplate({
        lastGeneratedPeriodKey: "2026-07",
        lastGeneratedPurchaseId: purchaseId,
        lastGeneratedAccountPayableId: accountPayableId,
      }),
    );

    await usecase.execute({
      templateId,
      userId,
      payment: {
        method: "Transferencia",
        date: "2026-07-10",
        currency: CurrencyType.PEN,
        amount: 60,
      },
    });

    expect(generateCurrentPayable.execute).not.toHaveBeenCalled();
    expect(createPayment.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        poId: purchaseId,
        accountPayableId,
        amount: 60,
      }),
      purchaseId,
      expect.any(Object),
    );
  });

  it("creates a pending approval payment when the user cannot approve payments", async () => {
    const { usecase, createPayment, recalculateAccountPayable, accessControlService } = buildDeps();
    accessControlService.userHasAllPermissions.mockResolvedValue(false);

    await usecase.execute({
      templateId,
      userId,
      payment: {
        method: "Transferencia",
        date: "2026-07-10",
        currency: CurrencyType.PEN,
        amount: 120,
      },
    });

    expect(createPayment.execute).toHaveBeenCalledWith(
      expect.any(Object),
      purchaseId,
      expect.objectContaining({
        status: "PENDING_APPROVAL",
        requestedByUserId: userId,
        approvedByUserId: undefined,
      }),
    );
    expect(recalculateAccountPayable.execute).not.toHaveBeenCalled();
  });

  it("fails when the recurring purchase does not exist", async () => {
    const { usecase, templateRepo } = buildDeps();
    templateRepo.findById.mockResolvedValue(null);

    await expect(
      usecase.execute({
        templateId,
        userId,
        payment: {
          method: "Transferencia",
          date: "2026-07-10",
          currency: CurrencyType.PEN,
          amount: 120,
        },
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
