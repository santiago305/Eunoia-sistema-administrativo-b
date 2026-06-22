import { CurrencyType } from "src/modules/payments/domain/value-objects/currency-type";

export interface CreateAccountPayableInput {
  purchaseId: string;
  quotaId?: string;
  supplierId?: string;
  description?: string;
  currency: CurrencyType;
  amountTotal: number;
  dueDate?: Date;
  createdByUserId?: string;
}

