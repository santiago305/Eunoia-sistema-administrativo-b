import { RecurringPurchaseTemplate } from "../../domain/entity/recurring-purchase-template";
import { RecurringPurchaseNotificationService } from "./recurring-purchase-notification.service";

const buildTemplate = () =>
  RecurringPurchaseTemplate.create({
    recurringPurchaseTemplateId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    supplierId: "11111111-1111-4111-8111-111111111111",
    name: "Hosting mensual",
    description: "Servidor principal",
    frequency: "MONTHLY",
    currency: "PEN",
    amount: 120,
    startDate: new Date("2026-06-10T00:00:00.000Z"),
    nextDueDate: new Date("2026-07-10T00:00:00.000Z"),
  });

describe("RecurringPurchaseNotificationService", () => {
  const service = new RecurringPurchaseNotificationService();

  it.each([
    [7, "Compra recurrente por vencer", "vence en 7 dias", "NORMAL"],
    [3, "Compra recurrente por vencer", "vence en 3 dias", "NORMAL"],
    [1, "Compra recurrente urgente", "vence manana", "HIGH"],
    [0, "Compra recurrente vence hoy", "vence hoy", "URGENT"],
  ] as const)("builds reminder content for %i days before due date", (daysUntilDue, title, phrase, priority) => {
    const notification = service.buildDueReminderNotification({
      template: buildTemplate(),
      daysUntilDue,
    });

    expect(notification).toEqual(
      expect.objectContaining({
        type: "RECURRING_PURCHASE_REMINDER",
        category: "PURCHASES",
        title,
        priority,
        actionUrl: "/compras/recurrentes",
        actionLabel: "Ver o registrar pago",
        sourceModule: "recurring-purchases",
        sourceEntityType: "recurring_purchase_template",
        sourceEntityId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      }),
    );
    expect(notification.message).toContain("Hosting mensual");
    expect(notification.message).toContain(phrase);
    expect(notification.message).toContain("PEN 120.00");
    expect(notification.message).toContain("inicio 2026-06-10");
    expect(notification.message).toContain("vencimiento 2026-07-10");
    expect(notification.metadata).toEqual(
      expect.objectContaining({
        module: "recurring-purchases",
        notificationKind: "due_reminder",
        recurringTemplateId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        supplierId: "11111111-1111-4111-8111-111111111111",
        amount: 120,
        currency: "PEN",
        startDate: "2026-06-10",
        dueDate: "2026-07-10",
        daysUntilDue,
        actions: expect.arrayContaining([
          expect.objectContaining({
            id: "view-recurring-purchase",
            label: "Ver recurrente",
          }),
          expect.objectContaining({
            id: "register-recurring-payment",
            label: "Registrar pago",
          }),
        ]),
      }),
    );
  });

  it("builds payable-created content with purchase and payable references", () => {
    const notification = service.buildPayableCreatedNotification({
      template: buildTemplate(),
      purchaseId: "33333333-3333-4333-8333-333333333333",
      accountPayableId: "44444444-4444-4444-8444-444444444444",
      periodKey: "2026-07",
    });

    expect(notification.title).toBe("Cuenta por pagar recurrente generada");
    expect(notification.message).toContain("Hosting mensual");
    expect(notification.message).toContain("periodo 2026-07");
    expect(notification.message).toContain("PEN 120.00");
    expect(notification.metadata).toEqual(
      expect.objectContaining({
        module: "recurring-purchases",
        notificationKind: "payable_created",
        recurringTemplateId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        purchaseId: "33333333-3333-4333-8333-333333333333",
        accountPayableId: "44444444-4444-4444-8444-444444444444",
        periodKey: "2026-07",
        dueDate: "2026-07-10",
      }),
    );
  });
});
