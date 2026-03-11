import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { PaymentDocument } from "../entity/payment-document";

export const PAYMENT_DOCUMENT_REPOSITORY = Symbol("PAYMENT_DOCUMENT_REPOSITORY");

export interface PaymentDocumentRepository {
  findById(payDocId: string, tx?: TransactionContext): Promise<PaymentDocument | null>;
  findByPoId(poId: string, tx?: TransactionContext): Promise<PaymentDocument[]>;
  findLatestByQuotaId(
    quotaId: string,
    excludePayDocId?: string,
    tx?: TransactionContext,
  ): Promise<PaymentDocument | null>;
  create(document: PaymentDocument, tx?: TransactionContext): Promise<PaymentDocument>;
  deleteById(payDocId: string, tx?: TransactionContext): Promise<void>;
  list(
    params: { poId?: string; quotaId?: string; page?: number; limit?: number },
    tx?: TransactionContext,
  ): Promise<{ items: PaymentDocument[]; total: number }>;
}
