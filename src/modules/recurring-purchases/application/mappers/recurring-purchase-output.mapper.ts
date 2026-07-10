import { RecurringPurchaseTemplate } from "../../domain/entity/recurring-purchase-template";
import { RecurringPurchaseOutput } from "../dtos/recurring-purchase.output";

export const toRecurringPurchaseOutput = (
  template: RecurringPurchaseTemplate,
): RecurringPurchaseOutput => ({
  recurringPurchaseTemplateId: template.recurringPurchaseTemplateId,
  supplierId: template.supplierId,
  name: template.name,
  description: template.description,
  frequency: template.frequency,
  purchaseType: template.purchaseType,
  currency: template.currency,
  amount: template.amount,
  startDate: template.startDate,
  nextDueDate: template.nextDueDate,
  billingAnchorDay: template.billingAnchorDay,
  status: template.status,
  reminderDaysBefore: template.reminderDaysBefore,
  createdByUserId: template.createdByUserId,
  lastGeneratedAt: template.lastGeneratedAt,
  lastGeneratedPeriodKey: template.lastGeneratedPeriodKey,
  lastGeneratedPurchaseId: template.lastGeneratedPurchaseId,
  lastGeneratedAccountPayableId: template.lastGeneratedAccountPayableId,
  createdAt: template.createdAt,
  updatedAt: template.updatedAt,
});
