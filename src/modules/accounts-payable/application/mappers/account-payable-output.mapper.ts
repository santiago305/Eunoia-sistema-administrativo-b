import { AccountPayable } from "../../domain/entity/account-payable";
import { AccountPayableOutput } from "../dtos/output/account-payable.output";

export class AccountPayableOutputMapper {
  static toOutput(payable: AccountPayable): AccountPayableOutput {
    return {
      accountPayableId: payable.accountPayableId,
      purchaseId: payable.purchaseId,
      quotaId: payable.quotaId ?? null,
      supplierId: payable.supplierId ?? null,
      description: payable.description ?? null,
      currency: payable.currency,
      amountTotal: payable.amountTotal,
      amountPaid: payable.amountPaid,
      amountPending: payable.amountPending,
      dueDate: payable.dueDate ?? null,
      status: payable.status,
      createdByUserId: payable.createdByUserId ?? null,
      createdAt: payable.createdAt ?? null,
      updatedAt: payable.updatedAt ?? null,
    };
  }
}

