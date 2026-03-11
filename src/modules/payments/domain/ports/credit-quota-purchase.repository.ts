import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { CreditQuotaPurchase } from "../entity/credit-quota-purchase";

export const CREDIT_QUOTA_PURCHASE_REPOSITORY = Symbol("CREDIT_QUOTA_PURCHASE_REPOSITORY");

export interface CreditQuotaPurchaseRepository {
  findByQuotaId(quotaId: string, tx?: TransactionContext): Promise<CreditQuotaPurchase | null>;
  create(link: CreditQuotaPurchase, tx?: TransactionContext): Promise<CreditQuotaPurchase>;
}
