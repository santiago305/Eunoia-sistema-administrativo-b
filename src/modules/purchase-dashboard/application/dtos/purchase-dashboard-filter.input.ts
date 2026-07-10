import { PurchasePaymentStatus } from "src/modules/purchases/domain/value-objects/purchase-payment-status";
import { PurchaseType } from "src/modules/purchases/domain/value-objects/purchase-type";

export type PurchaseDashboardFilterInput = {
  from?: string;
  to?: string;
  supplierId?: string;
  supplierIds?: string[] | string;
  purchaseType?: string;
  purchaseTypes?: string[] | string;
  status?: string;
  paymentStatus?: string;
  paymentStatuses?: string[] | string;
  userId?: string;
  userIds?: string[] | string;
  warehouseId?: string;
  warehouseIds?: string[] | string;
  paymentMethodId?: string;
  paymentMethodIds?: string[] | string;
  companyPaymentAccountId?: string;
  companyPaymentAccountIds?: string[] | string;
  limit?: number | string;
};

export type PurchaseDashboardFilters = {
  from?: Date;
  to?: Date;
  supplierId?: string;
  supplierIds?: string[];
  purchaseType?: string;
  purchaseTypes?: string[];
  status?: string;
  paymentStatus?: string;
  paymentStatuses?: string[];
  userId?: string;
  userIds?: string[];
  warehouseId?: string;
  warehouseIds?: string[];
  paymentMethodId?: string;
  paymentMethodIds?: string[];
  companyPaymentAccountId?: string;
  companyPaymentAccountIds?: string[];
  limit?: number;
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

const normalizeLimit = (value?: number | string): number | undefined => {
  if (value === undefined || value === null || value === "") return undefined;
  const limit = Number(value);
  if (!Number.isFinite(limit)) return undefined;
  return Math.min(Math.max(Math.trunc(limit), 1), 50);
};

const normalizeStringList = (...values: Array<string[] | string | undefined>): string[] | undefined => {
  const normalized = values
    .flatMap((value) => Array.isArray(value) ? value : value ? [value] : [])
    .flatMap((value) => String(value).split(","))
    .map((value) => value.trim())
    .filter(Boolean);

  const unique = Array.from(new Set(normalized));
  return unique.length ? unique : undefined;
};

export const normalizePurchaseDashboardFilters = (
  input: PurchaseDashboardFilterInput = {},
): PurchaseDashboardFilters => ({
  from: startOfUtcDay(input.from),
  to: endOfUtcDay(input.to),
  supplierId: input.supplierId,
  supplierIds: normalizeStringList(input.supplierId, input.supplierIds),
  purchaseType: input.purchaseType,
  purchaseTypes: normalizeStringList(input.purchaseType, input.purchaseTypes),
  status: input.status,
  paymentStatus: input.paymentStatus,
  paymentStatuses: normalizeStringList(input.paymentStatus, input.paymentStatuses),
  userId: input.userId,
  userIds: normalizeStringList(input.userId, input.userIds),
  warehouseId: input.warehouseId,
  warehouseIds: normalizeStringList(input.warehouseId, input.warehouseIds),
  paymentMethodId: input.paymentMethodId,
  paymentMethodIds: normalizeStringList(input.paymentMethodId, input.paymentMethodIds),
  companyPaymentAccountId: input.companyPaymentAccountId,
  companyPaymentAccountIds: normalizeStringList(input.companyPaymentAccountId, input.companyPaymentAccountIds),
  limit: normalizeLimit(input.limit),
});

