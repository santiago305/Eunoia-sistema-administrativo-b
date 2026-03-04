import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { CreditQuota } from "../entity/credit-quota";

export const CREDIT_QUOTA_REPOSITORY = Symbol("CREDIT_QUOTA_REPOSITORY");

export interface CreditQuotaRepository {
  findById(quotaId: string, tx?: TransactionContext): Promise<CreditQuota | null>;
  create(quota: CreditQuota, tx?: TransactionContext): Promise<CreditQuota>;
  deleteById(quotaId: string, tx?: TransactionContext): Promise<void>;
  list(
    params: { poId?: string; page?: number; limit?: number },
    tx?: TransactionContext,
  ): Promise<{ items: CreditQuota[]; total: number }>;
}
