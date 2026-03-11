import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { PaymentDocument } from "../entity/payment-document";

export const PAYMENT_DOCUMENT_REPOSITORY = Symbol("PAYMENT_DOCUMENT_REPOSITORY");

export interface PaymentDocumentRepository {
  findById(payDocId: string, tx?: TransactionContext): Promise<PaymentDocument | null>;
  create(document: PaymentDocument, tx?: TransactionContext): Promise<PaymentDocument>;
  deleteById(payDocId: string, tx?: TransactionContext): Promise<void>;
}
