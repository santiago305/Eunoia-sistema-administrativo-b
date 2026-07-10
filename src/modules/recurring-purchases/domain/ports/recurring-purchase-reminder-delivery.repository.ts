import { TransactionContext } from "src/shared/domain/ports/transaction-context.port";

export const RECURRING_PURCHASE_REMINDER_DELIVERY_REPOSITORY = Symbol(
  "RECURRING_PURCHASE_REMINDER_DELIVERY_REPOSITORY",
);

export interface RecurringPurchaseReminderDeliveryKey {
  templateId: string;
  periodKey: string;
  dueDate: Date;
  daysBefore: number;
}

export interface RecurringPurchaseReminderDeliveryRepository {
  hasDelivery(key: RecurringPurchaseReminderDeliveryKey, tx?: TransactionContext): Promise<boolean>;
  recordDelivery(
    delivery: RecurringPurchaseReminderDeliveryKey & { sentAt: Date },
    tx?: TransactionContext,
  ): Promise<void>;
}
