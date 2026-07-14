import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { CurrencyType } from "src/modules/payments/domain/value-objects/currency-type";

export const LOGISTICS_PAYABLES_REPOSITORY = Symbol("LOGISTICS_PAYABLES_REPOSITORY");

export type LogisticsPayableConfig = {
  generatesPayable: boolean;
  payableSupplierId: string | null;
  payableDescription: string | null;
};

export type InternalLogisticsPurchaseInput = {
  supplierId: string;
  total: number;
  currency: CurrencyType;
  note: string;
  createdByUserId?: string | null;
  dateIssue: Date;
  dateExpiration: Date;
};

export type LogisticsAccountPayableInput = {
  purchaseId: string;
  supplierId: string;
  description: string;
  currency: CurrencyType;
  amountTotal: number;
  dueDate: Date;
  createdByUserId?: string | null;
};

export type SaleOrderLogisticsPayableLinkInput = {
  saleOrderId: string;
  purchaseId: string;
  accountPayableId: string;
  agencySubsidiaryId: string;
  amount: number;
  status: "ACTIVE" | "CANCELLED";
};

export interface LogisticsPayablesRepository {
  findSubsidiaryPayableConfig(
    agencySubsidiaryId: string,
    tx?: TransactionContext,
  ): Promise<LogisticsPayableConfig | null>;
  findActiveBySaleOrderId(
    saleOrderId: string,
    tx?: TransactionContext,
  ): Promise<{ purchaseId: string; accountPayableId: string; amount: number; amountPaid: number } | null>;
  createInternalPurchase(
    input: InternalLogisticsPurchaseInput,
    tx?: TransactionContext,
  ): Promise<{ purchaseId: string }>;
  createAccountPayable(
    input: LogisticsAccountPayableInput,
    tx?: TransactionContext,
  ): Promise<{ accountPayableId: string }>;
  createLink(
    input: SaleOrderLogisticsPayableLinkInput,
    tx?: TransactionContext,
  ): Promise<{ id: string }>;
  updatePendingAmounts(
    input: { saleOrderId: string; purchaseId: string; accountPayableId: string; amount: number },
    tx?: TransactionContext,
  ): Promise<void>;
  cancelPending(
    input: { saleOrderId: string; purchaseId: string; accountPayableId: string },
    tx?: TransactionContext,
  ): Promise<void>;
}
