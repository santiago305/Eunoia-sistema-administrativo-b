import { CurrencyType } from "../value-objects/currency-type";
import { PayDocType } from "../value-objects/pay-doc-type";
import { InvalidPaymentDocumentError } from "../errors/invalid-payment-document.error";
import { PaymentsDomainService } from "../services/payments-domain.service";
export class PaymentDocument {
  private constructor(
    public readonly payDocId: string,
    public readonly method: string,
    public readonly date: Date,
    public readonly currency: CurrencyType,
    public readonly amount: number,
    public readonly fromDocumentType: PayDocType,
    public readonly operationNumber?: string,
    public readonly note?: string,
    public readonly poId?: string,
    public readonly quotaId?: string,
    public readonly accountPayableId?: string,
    public readonly status: "SCHEDULED" | "PENDING_APPROVAL" | "APPROVED" | "REJECTED" = "APPROVED",
    public readonly requestedByUserId?: string,
    public readonly approvedByUserId?: string,
    public readonly rejectedByUserId?: string,
    public readonly approvedAt?: Date,
    public readonly rejectedAt?: Date,
    public readonly rejectionReason?: string,
    public readonly companyPaymentAccountId?: string,
    public readonly paymentMethodId?: string,
    public readonly paidByUserId?: string,
    public readonly scheduledByUserId?: string,
    public readonly scheduledAt?: Date,
    public readonly paidAt?: Date,
    public readonly paymentEvidenceFileId?: string,
    public readonly bankName?: string,
    public readonly cardLastFour?: string,
    public readonly operationCode?: string,
    public readonly isPartial: boolean = false,
    public readonly companyPaymentAccountMaskedLabel?: string,
    public readonly paymentEvidenceCount: number = 0,
  ) {}

  static create(params: {
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
    accountPayableId?: string;
    status?: "SCHEDULED" | "PENDING_APPROVAL" | "APPROVED" | "REJECTED";
    requestedByUserId?: string;
    approvedByUserId?: string;
    rejectedByUserId?: string;
    approvedAt?: Date;
    rejectedAt?: Date;
    rejectionReason?: string;
    companyPaymentAccountId?: string;
    paymentMethodId?: string;
    paidByUserId?: string;
    scheduledByUserId?: string;
    scheduledAt?: Date;
    paidAt?: Date;
    paymentEvidenceFileId?: string;
    bankName?: string;
    cardLastFour?: string;
    operationCode?: string;
    isPartial?: boolean;
    companyPaymentAccountMaskedLabel?: string;
    paymentEvidenceCount?: number;
  }) {
    const method = PaymentsDomainService.normalizeMethod(params.method);
    if (!method || Number.isNaN(params.date.getTime()) || !PaymentsDomainService.isPositiveAmount(params.amount)) {
      throw new InvalidPaymentDocumentError();
    }

    return new PaymentDocument(
      params.payDocId,
      method,
      params.date,
      params.currency,
      params.amount,
      params.fromDocumentType,
      params.operationNumber?.trim() || undefined,
      params.note?.trim() || undefined,
      params.poId,
      params.quotaId,
      params.accountPayableId,
      params.status ?? "APPROVED",
      params.requestedByUserId,
      params.approvedByUserId,
      params.rejectedByUserId,
      params.approvedAt,
      params.rejectedAt,
      params.rejectionReason?.trim() || undefined,
      params.companyPaymentAccountId,
      params.paymentMethodId,
      params.paidByUserId,
      params.scheduledByUserId,
      params.scheduledAt,
      params.paidAt,
      params.paymentEvidenceFileId,
      params.bankName?.trim() || undefined,
      params.cardLastFour?.replace(/\D/g, "").slice(-4) || undefined,
      params.operationCode?.trim() || undefined,
      params.isPartial ?? false,
      params.companyPaymentAccountMaskedLabel?.trim() || undefined,
      Math.max(0, Number(params.paymentEvidenceCount ?? 0)),
    );
  }
}
