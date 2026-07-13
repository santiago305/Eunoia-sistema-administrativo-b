import { NotFoundException } from "@nestjs/common";
import { PurchaseType } from "src/modules/purchases/domain/value-objects/purchase-type";
import { RecurringPurchaseTemplate } from "../../domain/entity/recurring-purchase-template";
import { UpdateRecurringPurchaseUsecase } from "./update-recurring-purchase.usecase";

describe("UpdateRecurringPurchaseUsecase", () => {
  const repo = {
    findById: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("updates editable fields while preserving status and generated references", async () => {
    const existing = RecurringPurchaseTemplate.create({
      recurringPurchaseTemplateId: "11111111-1111-4111-8111-111111111111",
      supplierId: "22222222-2222-4222-8222-222222222222",
      name: "Hosting mensual",
      description: "Servidor",
      frequency: "MONTHLY",
      purchaseType: PurchaseType.SUBSCRIPTION,
      currency: "PEN",
      amount: 150,
      startDate: new Date("2026-07-01T00:00:00.000Z"),
      status: "PAUSED",
      lastGeneratedAt: new Date("2026-07-15T00:00:00.000Z"),
      lastGeneratedPeriodKey: "2026-07",
      lastGeneratedPurchaseId: "33333333-3333-4333-8333-333333333333",
      lastGeneratedAccountPayableId: "44444444-4444-4444-8444-444444444444",
      createdByUserId: "55555555-5555-4555-8555-555555555555",
    });
    repo.findById.mockResolvedValue(existing);
    repo.update.mockImplementation(async (template) => template);

    const usecase = new UpdateRecurringPurchaseUsecase(repo as any);
    const result = await usecase.execute({
      recurringPurchaseTemplateId: existing.recurringPurchaseTemplateId,
      supplierId: "66666666-6666-4666-8666-666666666666",
      name: "Hosting actualizado",
      description: "Servidor dedicado",
      frequency: "ANNUAL",
      purchaseType: PurchaseType.SERVICE,
      currency: "USD",
      amount: 180,
      startDate: new Date("2026-08-10T00:00:00.000Z"),
      reminderDaysBefore: [10, 5, 0],
    });

    expect(repo.update).toHaveBeenCalledWith(
      expect.objectContaining({
        recurringPurchaseTemplateId: existing.recurringPurchaseTemplateId,
        supplierId: "66666666-6666-4666-8666-666666666666",
        name: "Hosting actualizado",
        status: "PAUSED",
        lastGeneratedPeriodKey: "2026-07",
        lastGeneratedPurchaseId: "33333333-3333-4333-8333-333333333333",
        lastGeneratedAccountPayableId: "44444444-4444-4444-8444-444444444444",
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        recurringPurchaseTemplateId: existing.recurringPurchaseTemplateId,
        name: "Hosting actualizado",
        frequency: "ANNUAL",
        currency: "USD",
        amount: 180,
        status: "PAUSED",
      }),
    );
  });

  it("throws when the recurring purchase does not exist", async () => {
    repo.findById.mockResolvedValue(null);
    const usecase = new UpdateRecurringPurchaseUsecase(repo as any);

    await expect(
      usecase.execute({
        recurringPurchaseTemplateId: "11111111-1111-4111-8111-111111111111",
        supplierId: "22222222-2222-4222-8222-222222222222",
        name: "Hosting",
        frequency: "MONTHLY",
        currency: "PEN",
        amount: 150,
        startDate: new Date("2026-07-01T00:00:00.000Z"),
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
