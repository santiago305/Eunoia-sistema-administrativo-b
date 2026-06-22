import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
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
    params: { status?: PayableStatus; purchaseId?: string; page?: number; limit?: number },
    tx?: TransactionContext,
  ): Promise<{ items: AccountPayable[]; total: number }>;
  markOverdue(now: Date, tx?: TransactionContext): Promise<number>;
}

