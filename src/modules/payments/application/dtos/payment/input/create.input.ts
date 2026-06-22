import { CurrencyType } from "src/modules/payments/domain/value-objects/currency-type";
export interface CreatePaymentInput {
  method: string;
  date: string;
  operationNumber?: string;
  currency: CurrencyType;
  amount: number;
  note?: string;
  quotaId?: string;
  poId?:string;
  accountPayableId?: string;
  companyPaymentAccountId?: string;
  paymentMethodId?: string;
  paidByUserId?: string;
  scheduledByUserId?: string;
  scheduledAt?: string;
  paidAt?: string;
  paymentEvidenceFileId?: string;
  bankName?: string;
  cardLastFour?: string;
  operationCode?: string;
  isPartial?: boolean;
}
