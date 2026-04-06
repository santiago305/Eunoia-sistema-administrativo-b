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
    );
  }
}
