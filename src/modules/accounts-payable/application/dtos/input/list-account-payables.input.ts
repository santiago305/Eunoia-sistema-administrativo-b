import { PayableStatus } from "src/modules/accounts-payable/domain/value-objects/payable-status";

export interface ListAccountPayablesInput {
  status?: PayableStatus;
  purchaseId?: string;
  page?: number;
  limit?: number;
}

