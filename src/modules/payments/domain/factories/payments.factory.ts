import { CreditQuota } from "../entity/credit-quota";
import { PaymentDocument } from "../entity/payment-document";
import { CurrencyType } from "../value-objects/currency-type";
import { PayDocType } from "../value-objects/pay-doc-type";

export class PaymentsFactory {
  static createPaymentDocument(params: {
    payDocId?: string;
    method: string;
    date: Date;
    currency: CurrencyType;
    amount: number;
    fromDocumentType: PayDocType;
    operationNumber?: string;
    note?: string;
    poId?: string;
    quotaId?: string;
    status?: "PENDING_APPROVAL" | "APPROVED" | "REJECTED";
    requestedByUserId?: string;
    approvedByUserId?: string;
    rejectedByUserId?: string;
    approvedAt?: Date;
    rejectedAt?: Date;
    rejectionReason?: string;
  }) {
    return PaymentDocument.create(params);
  }

  static createCreditQuota(params: {
    quotaId?: string;
    number: number;
    expirationDate: Date;
    totalToPay: number;
    totalPaid?: number;
    fromDocumentType: PayDocType;
    paymentDate?: Date;
    createdAt?: Date;
    poId?: string;
  }) {
    return CreditQuota.create(params);
  }
}
