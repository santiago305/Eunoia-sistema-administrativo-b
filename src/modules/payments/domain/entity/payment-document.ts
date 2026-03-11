import { CurrencyType } from "../value-objects/currency-type";
import { PayDocType } from "../value-objects/pay-doc-type";
import { PaymentType } from "../value-objects/payment-type";

export class PaymentDocument {
  constructor(
    public readonly payDocId: string,
    public readonly method: PaymentType,
    public readonly date: Date,
    public readonly currency: CurrencyType,
    public readonly amount: number,
    public readonly fromDocumentType: PayDocType,
    public readonly operationNumber?: string,
    public readonly note?: string,
  ) {}
}
