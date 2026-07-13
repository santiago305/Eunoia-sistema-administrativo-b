import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { CurrencyType } from "src/modules/payments/domain/value-objects/currency-type";
import { AccountPayable } from "../entity/account-payable";
import { PayableStatus } from "../value-objects/payable-status";

export const ACCOUNT_PAYABLE_REPOSITORY = Symbol("ACCOUNT_PAYABLE_REPOSITORY");

export interface AccountPayableRepository {
  create(payable: AccountPayable, tx?: TransactionContext): Promise<AccountPayable>;
  update(payable: AccountPayable, tx?: TransactionContext): Promise<AccountPayable>;
  findById(accountPayableId: string, tx?: TransactionContext): Promise<AccountPayable | null>;
  findByPurchaseAndQuota(
    purchaseId: string,
    quotaId?: string,
    tx?: TransactionContext,
  ): Promise<AccountPayable | null>;
  list(
    params: {
      q?: string;
      status?: PayableStatus;
      statuses?: PayableStatus[];
      purchaseId?: string;
      supplierId?: string;
      currency?: CurrencyType;
      dueFrom?: string;
      dueTo?: string;
      amountPendingMin?: number;
      amountPendingMax?: number;
      page?: number;
      limit?: number;
    },
    tx?: TransactionContext,
  ): Promise<{ items: AccountPayable[]; total: number }>;
  markOverdue(now: Date, tx?: TransactionContext): Promise<number>;
}

