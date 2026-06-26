import { TransactionContext } from "src/shared/domain/ports/transaction-context.port";
import { RecurringPurchaseTemplate } from "../entity/recurring-purchase-template";
import { RecurringStatus } from "../value-objects/recurring-status";

export const RECURRING_PURCHASE_TEMPLATE_REPOSITORY = Symbol("RECURRING_PURCHASE_TEMPLATE_REPOSITORY");

export interface RecurringPurchaseTemplateRepository {
  create(template: RecurringPurchaseTemplate, tx?: TransactionContext): Promise<RecurringPurchaseTemplate>;
  update(template: RecurringPurchaseTemplate, tx?: TransactionContext): Promise<RecurringPurchaseTemplate>;
  findById(id: string, tx?: TransactionContext): Promise<RecurringPurchaseTemplate | null>;
  list(
    params: { status?: RecurringStatus; page?: number; limit?: number },
    tx?: TransactionContext,
  ): Promise<{ items: RecurringPurchaseTemplate[]; total: number; page: number; limit: number }>;
  findDueForGeneration(now: Date, tx?: TransactionContext): Promise<RecurringPurchaseTemplate[]>;
}
