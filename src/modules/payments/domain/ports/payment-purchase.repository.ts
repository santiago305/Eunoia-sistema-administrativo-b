import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { PaymentPurchase } from "../entity/payment-purchase";
import { PaymentPurchaseDetail } from "../read-models/payment-purchase-detail.rm";

export const PAYMENT_PURCHASE_REPOSITORY = Symbol("PAYMENT_PURCHASE_REPOSITORY");

export interface PaymentPurchaseRepository {
  findByPayDocId(payDocId: string, tx?: TransactionContext): Promise<PaymentPurchaseDetail | null>;
  findByPoId(poId: string, tx?: TransactionContext): Promise<PaymentPurchaseDetail[]>;
  findLatestByQuotaId(quotaId: string, excludePayDocId?: string, tx?: TransactionContext): Promise<PaymentPurchaseDetail | null>;
  create(link: PaymentPurchase, tx?: TransactionContext): Promise<PaymentPurchase>;
  list(
    params: {
      poId?: string;
      quotaId?: string;
      page?: number;
      limit?: number;
    },
    tx?: TransactionContext,
  ): Promise<{ items: PaymentPurchaseDetail[]; total: number }>;
}
