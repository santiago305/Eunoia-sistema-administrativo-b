import { CurrencyType } from "src/modules/payments/domain/value-objects/currency-type";
import { PayableStatus } from "src/modules/accounts-payable/domain/value-objects/payable-status";

export interface AccountPayableOutput {
  accountPayableId: string;
  purchaseId: string;
  quotaId?: string | null;
  supplierId?: string | null;
  description?: string | null;
  currency: CurrencyType;
  amountTotal: number;
  amountPaid: number;
  amountPending: number;
  dueDate?: Date | null;
  status: PayableStatus;
  createdByUserId?: string | null;
  createdAt?: Date | null;
  updatedAt?: Date | null;
}

