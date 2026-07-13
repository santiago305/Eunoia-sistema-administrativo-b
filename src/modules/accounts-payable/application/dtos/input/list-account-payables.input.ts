import { PayableStatus } from "src/modules/accounts-payable/domain/value-objects/payable-status";
import { CurrencyType } from "src/modules/payments/domain/value-objects/currency-type";

export interface ListAccountPayablesInput {
  q?: string;
  status?: PayableStatus;
  statuses?: PayableStatus[];
  purchaseId?: string;
  supplierId?: string;
  currency?: CurrencyType;
  dueFrom?: string;
  dueTo?: string;
  amountPendingMin?: number;
  amountPendingMax?: number;
  page?: number;
  limit?: number;
}

