import { TransactionContext } from "src/shared/domain/ports/transaction-context.port";
import { CurrencyType } from "src/modules/purchases/domain/value-objects/currency-type";
import { PurchaseType } from "src/modules/purchases/domain/value-objects/purchase-type";
import { RecurringFrequency } from "../value-objects/recurring-frequency";
import { RecurringPurchaseSearchRule } from "../../application/dtos/recurring-purchase-search/recurring-purchase-search-snapshot";
import { RecurringPurchaseTemplate } from "../entity/recurring-purchase-template";
import { RecurringStatus } from "../value-objects/recurring-status";

export const RECURRING_PURCHASE_TEMPLATE_REPOSITORY = Symbol("RECURRING_PURCHASE_TEMPLATE_REPOSITORY");

export interface RecurringPurchaseTemplateListParams {
  status?: RecurringStatus;
  statuses?: RecurringStatus[];
  supplierId?: string;
  supplierIds?: string[];
  frequency?: RecurringFrequency;
  frequencies?: RecurringFrequency[];
  currency?: CurrencyType;
  currencies?: CurrencyType[];
  purchaseType?: PurchaseType;
  purchaseTypes?: PurchaseType[];
  q?: string;
  filters?: RecurringPurchaseSearchRule[];
  page?: number;
  limit?: number;
}

export interface RecurringPurchaseTemplateRepository {
  create(template: RecurringPurchaseTemplate, tx?: TransactionContext): Promise<RecurringPurchaseTemplate>;
  update(template: RecurringPurchaseTemplate, tx?: TransactionContext): Promise<RecurringPurchaseTemplate>;
  findById(id: string, tx?: TransactionContext): Promise<RecurringPurchaseTemplate | null>;
  list(
    params: RecurringPurchaseTemplateListParams,
    tx?: TransactionContext,
  ): Promise<{ items: RecurringPurchaseTemplate[]; total: number; page: number; limit: number }>;
  findDueForGeneration(now: Date, tx?: TransactionContext): Promise<RecurringPurchaseTemplate[]>;
  findDueForReminderWindows(
    now: Date,
    windowsDaysBefore: number[],
    tx?: TransactionContext,
  ): Promise<RecurringPurchaseTemplate[]>;
}
