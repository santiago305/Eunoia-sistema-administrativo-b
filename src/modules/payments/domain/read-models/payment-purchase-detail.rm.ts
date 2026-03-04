import { CurrencyType } from "../value-objects/currency-type";
import { PayDocType } from "../value-objects/pay-doc-type";
import { PaymentType } from "../value-objects/payment-type";

export interface PaymentPurchaseDetail {
  payDocId: string;
  method: PaymentType;
  date: Date;
  operationNumber?: string | null;
  currency: CurrencyType;
  amount: number;
  note?: string | null;
  fromDocumentType: PayDocType;
  poId: string;
  quotaId?: string | null;
}
