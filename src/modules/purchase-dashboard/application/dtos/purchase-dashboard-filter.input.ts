import { PurchasePaymentStatus } from "src/modules/purchases/domain/value-objects/purchase-payment-status";
import { PurchaseType } from "src/modules/purchases/domain/value-objects/purchase-type";

export type PurchaseDashboardFilterInput = {
  from?: string;
  to?: string;
  supplierId?: string;
  purchaseType?: string;
  status?: string;
  paymentStatus?: string;
  userId?: string;
  warehouseId?: string;
  paymentMethodId?: string;
  companyPaymentAccountId?: string;
  limit?: number;
};

export type PurchaseDashboardFilters = Omit<PurchaseDashboardFilterInput, "from" | "to"> & {
  from?: Date;
  to?: Date;
};

const startOfUtcDay = (value?: string): Date | undefined => {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  date.setUTCHours(0, 0, 0, 0);
  return date;
};

const endOfUtcDay = (value?: string): Date | undefined => {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  date.setUTCHours(23, 59, 59, 999);
  return date;
};

export const normalizePurchaseDashboardFilters = (
  input: PurchaseDashboardFilterInput = {},
): PurchaseDashboardFilters => ({
  from: startOfUtcDay(input.from),
  to: endOfUtcDay(input.to),
  supplierId: input.supplierId,
  purchaseType: input.purchaseType,
  status: input.status,
  paymentStatus: input.paymentStatus,
  userId: input.userId,
  warehouseId: input.warehouseId,
  paymentMethodId: input.paymentMethodId,
  companyPaymentAccountId: input.companyPaymentAccountId,
  limit: input.limit,
});

