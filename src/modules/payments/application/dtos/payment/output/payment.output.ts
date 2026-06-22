import { CurrencyType } from "src/modules/payments/domain/value-objects/currency-type";
import { PayDocType } from "src/modules/payments/domain/value-objects/pay-doc-type";

export interface PaymentOutput {
  payDocId: string;
  method: string;
  date: Date;
  operationNumber?: string | null;
  currency: CurrencyType;
  amount: number;
  note?: string | null;
  fromDocumentType: PayDocType;
  poId: string;
  quotaId?: string | null;
  accountPayableId?: string | null;
  companyPaymentAccountId?: string | null;
  paymentMethodId?: string | null;
  status: "SCHEDULED" | "PENDING_APPROVAL" | "APPROVED" | "REJECTED";
  requestedByUserId?: string | null;
  approvedByUserId?: string | null;
  rejectedByUserId?: string | null;
  approvedAt?: Date | null;
  rejectedAt?: Date | null;
  rejectionReason?: string | null;
  paidByUserId?: string | null;
  scheduledByUserId?: string | null;
  scheduledAt?: Date | null;
  paidAt?: Date | null;
  paymentEvidenceFileId?: string | null;
  bankName?: string | null;
  cardLastFour?: string | null;
  operationCode?: string | null;
  isPartial?: boolean;
  companyPaymentAccountMaskedLabel?: string | null;
}
