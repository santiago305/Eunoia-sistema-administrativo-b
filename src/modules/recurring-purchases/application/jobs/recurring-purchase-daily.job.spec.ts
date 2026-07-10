import { RecurringPurchaseTemplate } from "../../domain/entity/recurring-purchase-template";
import { RecurringPurchaseDailyJob } from "./recurring-purchase-daily.job";

const templateId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const supplierId = "11111111-1111-4111-8111-111111111111";
const userId = "22222222-2222-4222-8222-222222222222";

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
      list: jest.fn(async () => ({ items: [template], total: 1, page: 1, limit: 100 })),
    };
    const generateCurrentPayable = { execute: jest.fn() };
    const notificationsService = { createNotificationForUsers: jest.fn(async () => undefined) };
    const reminderDeliveryRepo = {
      hasDelivery: jest.fn(async () => false),
      recordDelivery: jest.fn(async () => undefined),
    };

    const job = new RecurringPurchaseDailyJob(
      templateRepo as any,
      generateCurrentPayable as any,
      notificationsService as any,
      reminderDeliveryRepo as any,
    );

    return { job, templateRepo, notificationsService, reminderDeliveryRepo };
  };

  it("sends and records the due-day reminder once for the period", async () => {
    const { job, notificationsService, reminderDeliveryRepo } = buildDeps();

    const result = await job.run(new Date("2026-07-10T08:00:00.000Z"));

    expect(result.reminders).toBe(1);
    expect(reminderDeliveryRepo.hasDelivery).toHaveBeenCalledWith({
      templateId,
      periodKey: "2026-07",
      dueDate: new Date("2026-07-10T00:00:00.000Z"),
      daysBefore: 0,
    });
    expect(notificationsService.createNotificationForUsers).toHaveBeenCalledTimes(1);
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
});
