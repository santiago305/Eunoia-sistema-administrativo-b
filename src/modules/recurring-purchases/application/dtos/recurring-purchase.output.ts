import { CurrencyType } from "src/modules/purchases/domain/value-objects/currency-type";
import { PurchaseType } from "src/modules/purchases/domain/value-objects/purchase-type";
import { RecurringFrequency } from "../../domain/value-objects/recurring-frequency";
import { RecurringStatus } from "../../domain/value-objects/recurring-status";

export interface RecurringPurchaseOutput {
  recurringPurchaseTemplateId: string;
  supplierId: string;
  name: string;
  description?: string;
  frequency: RecurringFrequency;
  purchaseType: PurchaseType;
  currency: CurrencyType;
  amount: number;
  startDate: Date;
  nextDueDate: Date;
  status: RecurringStatus;
  reminderDaysBefore: number[];
  createdByUserId?: string;
  lastGeneratedAt?: Date;
  lastGeneratedPeriodKey?: string;
  lastGeneratedPurchaseId?: string;
  lastGeneratedAccountPayableId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}
