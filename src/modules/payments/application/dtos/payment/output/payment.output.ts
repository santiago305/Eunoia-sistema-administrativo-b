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
}
