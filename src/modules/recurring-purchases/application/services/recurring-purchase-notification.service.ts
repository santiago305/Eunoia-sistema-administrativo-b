import { Injectable } from "@nestjs/common";
import { RecurringPurchaseTemplate } from "../../domain/entity/recurring-purchase-template";

type NotificationPayload = {
  type: string;
  category: string;
  title: string;
  message: string;
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT" | "CRITICAL";
  actionUrl: string;
  actionLabel: string;
  sourceModule: string;
  sourceEntityType: string;
  sourceEntityId: string;
  metadata: Record<string, unknown>;
};

const ACTION_URL = "/compras/recurrentes";

@Injectable()
export class RecurringPurchaseNotificationService {
  buildDueReminderNotification(input: {
    template: RecurringPurchaseTemplate;
    daysUntilDue: number;
  }): NotificationPayload {
    const { template, daysUntilDue } = input;
    const duePhrase = this.getDuePhrase(daysUntilDue);
    const title = this.getReminderTitle(daysUntilDue);

    return {
      type: "RECURRING_PURCHASE_REMINDER",
      category: "PURCHASES",
      title,
      message: `${template.name} ${duePhrase}. Monto: ${this.formatMoney(template)}. Fecha de inicio ${this.formatDate(template.startDate)}. Fecha de vencimiento ${this.formatDate(template.nextDueDate)}.`,
      priority: this.getReminderPriority(daysUntilDue),
      actionUrl: ACTION_URL,
      actionLabel: "Ver o registrar pago",
      sourceModule: "recurring-purchases",
      sourceEntityType: "recurring_purchase_template",
      sourceEntityId: template.recurringPurchaseTemplateId,
      metadata: {
        ...this.baseMetadata(template),
        notificationKind: "due_reminder",
        daysUntilDue,
        actions: this.buildActions(template),
      },
    };
  }

  buildPayableCreatedNotification(input: {
    template: RecurringPurchaseTemplate;
    purchaseId: string;
    accountPayableId: string;
    periodKey: string;
  }): NotificationPayload {
    const { template, purchaseId, accountPayableId, periodKey } = input;

    return {
      type: "RECURRING_PURCHASE_PAYABLE_CREATED",
      category: "PURCHASES",
      title: "Cuenta por pagar recurrente generada",
      message: `Se genero la cuenta por pagar de ${template.name} para el periodo ${periodKey}. Monto: ${this.formatMoney(template)}. Vencimiento: ${this.formatDate(template.nextDueDate)}.`,
      priority: "NORMAL",
      actionUrl: ACTION_URL,
      actionLabel: "Ver o registrar pago",
      sourceModule: "recurring-purchases",
      sourceEntityType: "recurring_purchase_template",
      sourceEntityId: template.recurringPurchaseTemplateId,
      metadata: {
        ...this.baseMetadata(template),
        notificationKind: "payable_created",
        purchaseId,
        accountPayableId,
        periodKey,
        actions: this.buildActions(template, accountPayableId),
      },
    };
  }

  private getReminderTitle(daysUntilDue: number) {
    if (daysUntilDue <= 0) return "Compra recurrente vence hoy";
    if (daysUntilDue === 1) return "Compra recurrente urgente";
    return "Compra recurrente por vencer";
  }

  private getDuePhrase(daysUntilDue: number) {
    if (daysUntilDue <= 0) return "vence hoy";
    if (daysUntilDue === 1) return "vence manana";
    return `vence en ${daysUntilDue} dias`;
  }

  private getReminderPriority(daysUntilDue: number): NotificationPayload["priority"] {
    if (daysUntilDue <= 0) return "URGENT";
    if (daysUntilDue === 1) return "HIGH";
    return "NORMAL";
  }

  private baseMetadata(template: RecurringPurchaseTemplate) {
    return {
      module: "recurring-purchases",
      recurringTemplateId: template.recurringPurchaseTemplateId,
      supplierId: template.supplierId,
      amount: template.amount,
      currency: template.currency,
      startDate: this.formatDate(template.startDate),
      dueDate: this.formatDate(template.nextDueDate),
    };
  }

  private buildActions(template: RecurringPurchaseTemplate, accountPayableId?: string) {
    return [
      {
        id: "view-recurring-purchase",
        label: "Ver recurrente",
        url: ACTION_URL,
        metadata: { recurringTemplateId: template.recurringPurchaseTemplateId },
      },
      {
        id: "register-recurring-payment",
        label: "Registrar pago",
        url: ACTION_URL,
        metadata: {
          recurringTemplateId: template.recurringPurchaseTemplateId,
          accountPayableId: accountPayableId ?? template.lastGeneratedAccountPayableId ?? null,
        },
      },
    ];
  }

  private formatMoney(template: RecurringPurchaseTemplate) {
    return `${template.currency} ${template.amount.toFixed(2)}`;
  }

  private formatDate(date: Date) {
    return date.toISOString().slice(0, 10);
  }
}
