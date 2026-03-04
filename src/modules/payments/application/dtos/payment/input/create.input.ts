import { CurrencyType } from "src/modules/payments/domain/value-objects/currency-type";
import { PaymentType } from "src/modules/payments/domain/value-objects/payment-type";

export interface CreatePaymentInput {
  method: PaymentType;
  date: string;
  operationNumber?: string;
  currency: CurrencyType;
  amount: number;
  note?: string;
  quotaId?: string;
  poId?:string;
}
