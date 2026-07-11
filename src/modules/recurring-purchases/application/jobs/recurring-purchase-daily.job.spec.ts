import { RecurringPurchaseTemplate } from "../../domain/entity/recurring-purchase-template";
import { RecurringPurchaseDailyJob } from "./recurring-purchase-daily.job";

const templateId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const supplierId = "11111111-1111-4111-8111-111111111111";
const userId = "22222222-2222-4222-8222-222222222222";
const notificationUserId = "55555555-5555-4555-8555-555555555555";

const buildTemplate = () =>
  RecurringPurchaseTemplate.create({
    recurringPurchaseTemplateId: templateId,
    supplierId,
    name: "Hosting mensual",
    frequency: "MONTHLY",
    currency: "PEN",
    amount: 120,
    startDate: new Date("2026-06-10T00:00:00.000Z"),
    nextDueDate: new Date("2026-07-10T00:00:00.000Z"),
    createdByUserId: userId,
  });

describe("RecurringPurchaseDailyJob", () => {
  const buildDeps = () => {
    const template = buildTemplate();
    const templateRepo = {
      create: jest.fn(),
      update: jest.fn(),
      findById: jest.fn(),
      findDueForGeneration: jest.fn(async () => []),
      findDueForReminderWindows: jest.fn(async () => [template]),
      list: jest.fn(async () => ({ items: [template], total: 1, page: 1, limit: 100 })),
    };
    const generateCurrentPayable = { execute: jest.fn(async () => ({ generated: true })) };
    const notificationsService = { createNotificationForUsers: jest.fn(async () => undefined) };
    const reminderDeliveryRepo = {
      hasDelivery: jest.fn(async () => false),
      recordDelivery: jest.fn(async () => undefined),
    };
    const accessControlService = {
      getUserIdsWithPermission: jest.fn(async () => [notificationUserId]),
    };
    const recurringPurchaseNotificationService = {
      buildDueReminderNotification: jest.fn(() => ({
        type: "RECURRING_PURCHASE_REMINDER",
        category: "PURCHASES",
        title: "Compra recurrente vence hoy",
        message: "Hosting mensual vence hoy. Monto: PEN 120.00.",
        priority: "URGENT",
        actionUrl: "/compras/recurrentes",
        actionLabel: "Ver o registrar pago",
        sourceModule: "recurring-purchases",
        sourceEntityType: "recurring_purchase_template",
        sourceEntityId: templateId,
        metadata: {
          module: "recurring-purchases",
          notificationKind: "due_reminder",
          recurringTemplateId: templateId,
        },
      })),
    };

    const job = new RecurringPurchaseDailyJob(
      templateRepo as any,
      generateCurrentPayable as any,
      notificationsService as any,
      reminderDeliveryRepo as any,
      accessControlService as any,
      recurringPurchaseNotificationService as any,
    );

    return {
      job,
      templateRepo,
      notificationsService,
      reminderDeliveryRepo,
      accessControlService,
      recurringPurchaseNotificationService,
    };
  };

  it("sends and records the due-day reminder once for the period", async () => {
    const {
      job,
      templateRepo,
      notificationsService,
      reminderDeliveryRepo,
      accessControlService,
      recurringPurchaseNotificationService,
    } = buildDeps();

    const result = await job.run(new Date("2026-07-10T08:00:00.000Z"));

    expect(result.reminders).toBe(1);
    expect(templateRepo.findDueForReminderWindows).toHaveBeenCalledWith(
      new Date("2026-07-10T08:00:00.000Z"),
      [7, 3, 1, 0],
    );
    expect(templateRepo.list).not.toHaveBeenCalled();
    expect(reminderDeliveryRepo.hasDelivery).toHaveBeenCalledWith({
      templateId,
      periodKey: "2026-07",
      dueDate: new Date("2026-07-10T00:00:00.000Z"),
      daysBefore: 0,
    });
    expect(notificationsService.createNotificationForUsers).toHaveBeenCalledTimes(1);
    expect(accessControlService.getUserIdsWithPermission).toHaveBeenCalledWith(
      "recurring_purchases.receive_due_notifications",
    );
    expect(notificationsService.createNotificationForUsers).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientUserIds: [notificationUserId],
        title: "Compra recurrente vence hoy",
        message: "Hosting mensual vence hoy. Monto: PEN 120.00.",
        metadata: expect.objectContaining({
          module: "recurring-purchases",
          notificationKind: "due_reminder",
        }),
      }),
    );
    expect(recurringPurchaseNotificationService.buildDueReminderNotification).toHaveBeenCalledWith({
      template: expect.objectContaining({ recurringPurchaseTemplateId: templateId }),
      daysUntilDue: 0,
    });
    expect(reminderDeliveryRepo.recordDelivery).toHaveBeenCalledWith({
      templateId,
      periodKey: "2026-07",
      dueDate: new Date("2026-07-10T00:00:00.000Z"),
      daysBefore: 0,
      sentAt: new Date("2026-07-10T08:00:00.000Z"),
    });
  });

  it("does not send the same reminder twice", async () => {
    const { job, notificationsService, reminderDeliveryRepo } = buildDeps();
    reminderDeliveryRepo.hasDelivery.mockResolvedValue(true);

    const result = await job.run(new Date("2026-07-10T08:00:00.000Z"));

    expect(result.reminders).toBe(0);
    expect(notificationsService.createNotificationForUsers).not.toHaveBeenCalled();
    expect(reminderDeliveryRepo.recordDelivery).not.toHaveBeenCalled();
  });

  it("does not send reminders when no user has the notification permission", async () => {
    const { job, notificationsService, reminderDeliveryRepo, accessControlService } = buildDeps();
    accessControlService.getUserIdsWithPermission.mockResolvedValue([]);

    const result = await job.run(new Date("2026-07-10T08:00:00.000Z"));

    expect(result.reminders).toBe(0);
    expect(notificationsService.createNotificationForUsers).not.toHaveBeenCalled();
    expect(reminderDeliveryRepo.recordDelivery).not.toHaveBeenCalled();
  });

  it("generates current payables before sending reminders", async () => {
    const { job, templateRepo } = buildDeps();
    const dueTemplate = buildTemplate();
    templateRepo.findDueForGeneration.mockResolvedValue([dueTemplate]);

    const result = await job.run(new Date("2026-07-10T08:00:00.000Z"));

    expect(result.generated).toBe(1);
    expect(templateRepo.findDueForGeneration).toHaveBeenCalledWith(new Date("2026-07-10T08:00:00.000Z"));
  });
});
