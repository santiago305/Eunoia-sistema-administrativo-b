import { GenerateCurrentPayableUsecase } from "./generate-current-payable.usecase";
import { RecurringPurchaseTemplate } from "../../domain/entity/recurring-purchase-template";

const templateId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const supplierId = "11111111-1111-4111-8111-111111111111";
const userId = "22222222-2222-4222-8222-222222222222";
const notificationUserId = "55555555-5555-4555-8555-555555555555";

describe("GenerateCurrentPayableUsecase", () => {
  const buildDeps = () => {
    const template = RecurringPurchaseTemplate.create({
      recurringPurchaseTemplateId: templateId,
      supplierId,
      name: "Hosting mensual",
      description: "Servidor principal",
      frequency: "MONTHLY",
      currency: "PEN",
      amount: 150,
      startDate: new Date("2026-06-10T00:00:00.000Z"),
      nextDueDate: new Date("2026-06-10T00:00:00.000Z"),
      createdByUserId: userId,
    });
    const templateRepo = {
      create: jest.fn(),
      update: jest.fn(async (value) => value),
      findById: jest.fn(async () => template),
      list: jest.fn(),
      findDueForGeneration: jest.fn(),
    };
    const purchaseRepo = {
      create: jest.fn(async (purchase) => ({ ...purchase, poId: "33333333-3333-4333-8333-333333333333" })),
    };
    const accountPayable = {
      execute: jest.fn(async (input) => ({ accountPayableId: "44444444-4444-4444-8444-444444444444", ...input })),
    };
    const historyRepo = { save: jest.fn(async (event) => event) };
    const notifications = { createNotificationForUsers: jest.fn(async () => undefined) };
    const accessControlService = {
      getUserIdsWithPermission: jest.fn(async () => [notificationUserId]),
    };
    const recurringPurchaseNotificationService = {
      buildPayableCreatedNotification: jest.fn(() => ({
        type: "RECURRING_PURCHASE_PAYABLE_CREATED",
        category: "PURCHASES",
        title: "Cuenta por pagar recurrente generada",
        message: "Se genero la cuenta por pagar de Hosting mensual para el periodo 2026-06.",
        priority: "NORMAL",
        actionUrl: "/compras/recurrentes",
        actionLabel: "Ver o registrar pago",
        sourceModule: "recurring-purchases",
        sourceEntityType: "recurring_purchase_template",
        sourceEntityId: templateId,
        metadata: {
          module: "recurring-purchases",
          notificationKind: "payable_created",
          recurringTemplateId: templateId,
        },
      })),
    };
    const uow = { runInTransaction: jest.fn((work) => work({})) };

    const usecase = new GenerateCurrentPayableUsecase(
      uow as any,
      templateRepo as any,
      purchaseRepo as any,
      accountPayable as any,
      historyRepo as any,
      notifications as any,
      accessControlService as any,
      recurringPurchaseNotificationService as any,
    );

    return {
      usecase,
      templateRepo,
      purchaseRepo,
      accountPayable,
      historyRepo,
      notifications,
      accessControlService,
      recurringPurchaseNotificationService,
    };
  };

  it("creates a recurring purchase and payable for the due period", async () => {
    const {
      usecase,
      templateRepo,
      purchaseRepo,
      accountPayable,
      historyRepo,
      notifications,
      accessControlService,
      recurringPurchaseNotificationService,
    } = buildDeps();

    const result = await usecase.execute({
      templateId,
      generatedByUserId: userId,
      now: new Date("2026-06-11T12:00:00.000Z"),
    });

    expect(result.generated).toBe(true);
    expect(purchaseRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        supplierId,
        recurringTemplateId: templateId,
        isRecurringSource: true,
      }),
      {},
    );
    expect(accountPayable.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        purchaseId: "33333333-3333-4333-8333-333333333333",
        amountTotal: 150,
        dueDate: new Date("2026-06-10T00:00:00.000Z"),
      }),
      {},
    );
    expect(templateRepo.update).toHaveBeenCalledWith(
      expect.objectContaining({
        lastGeneratedPeriodKey: "2026-06",
        nextDueDate: new Date("2026-07-10T00:00:00.000Z"),
      }),
      {},
    );
    expect(historyRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "PAYABLE_CREATED" }),
      {},
    );
    expect(accessControlService.getUserIdsWithPermission).toHaveBeenCalledWith(
      "recurring_purchases.receive_due_notifications",
    );
    expect(notifications.createNotificationForUsers).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientUserIds: [notificationUserId],
        title: "Cuenta por pagar recurrente generada",
        metadata: expect.objectContaining({
          module: "recurring-purchases",
          notificationKind: "payable_created",
        }),
      }),
    );
    expect(recurringPurchaseNotificationService.buildPayableCreatedNotification).toHaveBeenCalledWith({
      template: expect.objectContaining({ recurringPurchaseTemplateId: templateId }),
      purchaseId: "33333333-3333-4333-8333-333333333333",
      accountPayableId: "44444444-4444-4444-8444-444444444444",
      periodKey: "2026-06",
    });
  });

  it("does not generate twice for the same period", async () => {
    const { usecase, templateRepo, purchaseRepo, accountPayable } = buildDeps();
    const generated = (await templateRepo.findById())!.markGenerated({
      purchaseId: "33333333-3333-4333-8333-333333333333",
      accountPayableId: "44444444-4444-4444-8444-444444444444",
      generatedAt: new Date("2026-06-10T10:00:00.000Z"),
    });
    templateRepo.findById.mockResolvedValue(generated);

    const result = await usecase.execute({
      templateId,
      generatedByUserId: userId,
      now: new Date("2026-06-11T12:00:00.000Z"),
    });

    expect(result.generated).toBe(false);
    expect(purchaseRepo.create).not.toHaveBeenCalled();
    expect(accountPayable.execute).not.toHaveBeenCalled();
  });

  it("generates the payable without sending a notification when no recipient has the permission", async () => {
    const { usecase, notifications, accessControlService, recurringPurchaseNotificationService } = buildDeps();
    accessControlService.getUserIdsWithPermission.mockResolvedValue([]);

    const result = await usecase.execute({
      templateId,
      generatedByUserId: userId,
      now: new Date("2026-06-11T12:00:00.000Z"),
    });

    expect(result.generated).toBe(true);
    expect(accessControlService.getUserIdsWithPermission).toHaveBeenCalledWith(
      "recurring_purchases.receive_due_notifications",
    );
    expect(recurringPurchaseNotificationService.buildPayableCreatedNotification).not.toHaveBeenCalled();
    expect(notifications.createNotificationForUsers).not.toHaveBeenCalled();
  });
});
