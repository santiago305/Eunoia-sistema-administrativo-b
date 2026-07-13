import { CurrencyType } from "src/modules/payments/domain/value-objects/currency-type";
import { PayDocType } from "src/modules/payments/domain/value-objects/pay-doc-type";
import { PaymentStatus } from "src/modules/payments/domain/ports/payment-document.repository";

export interface ListPaymentsInput {
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
