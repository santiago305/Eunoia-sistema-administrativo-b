import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { CurrencyType } from "../value-objects/currency-type";
import { PayDocType } from "../value-objects/pay-doc-type";
import { PaymentDocument } from "../entity/payment-document";

export const PAYMENT_DOCUMENT_REPOSITORY = Symbol("PAYMENT_DOCUMENT_REPOSITORY");

export type PaymentStatus = "SCHEDULED" | "PENDING_APPROVAL" | "APPROVED" | "REJECTED";

export interface ListPaymentDocumentsParams {
  q?: string;
  poId?: string;
  quotaId?: string;
  accountPayableId?: string;
  status?: PaymentStatus;
  statuses?: PaymentStatus[];
  currency?: CurrencyType;
  paymentMethodId?: string;
  paymentMethodIds?: string[];
  companyPaymentAccountId?: string;
  companyPaymentAccountIds?: string[];
  fromDocumentType?: PayDocType;
  dateFrom?: string;
  dateTo?: string;
  scheduledFrom?: string;
  scheduledTo?: string;
  paidFrom?: string;
  paidTo?: string;
  amountMin?: number;
  amountMax?: number;
  requestedByUserId?: string;
  approvedByUserId?: string;
  hasEvidence?: boolean;
  page?: number;
  limit?: number;
}

export interface PaymentDocumentRepository {
  findById(payDocId: string, tx?: TransactionContext): Promise<PaymentDocument | null>;
  findByPoId(poId: string, tx?: TransactionContext): Promise<PaymentDocument[]>;
  findApprovedByAccountPayableId(accountPayableId: string, tx?: TransactionContext): Promise<PaymentDocument[]>;
  findLatestByQuotaId(
    quotaId: string,
    excludePayDocId?: string,
    tx?: TransactionContext,
  ): Promise<PaymentDocument | null>;
  create(document: PaymentDocument, tx?: TransactionContext): Promise<PaymentDocument>;
  update(document: PaymentDocument, tx?: TransactionContext): Promise<PaymentDocument>;
  deleteById(payDocId: string, tx?: TransactionContext): Promise<void>;
  list(params: ListPaymentDocumentsParams, tx?: TransactionContext): Promise<{ items: PaymentDocument[]; total: number }>;
}
