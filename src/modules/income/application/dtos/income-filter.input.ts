export interface IncomeFilterInput {
  from?: string;
  to?: string;
  method?: string;
  companyPaymentAccountId?: string;
  saleOrderId?: string;
  client?: string;
  q?: string;
  hasEvidence?: boolean | string;
  page?: number | string;
  limit?: number | string;
}

export interface IncomeFilters {
  from?: string;
  to?: string;
  method?: string;
  companyPaymentAccountId?: string;
  saleOrderId?: string;
  client?: string;
  q?: string;
  hasEvidence?: boolean;
  page: number;
  limit: number;
}

const stringOrUndefined = (value?: string | null): string | undefined => {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
};

const pageNumber = (value: unknown, fallback: number): number => {
  const parsed = Number(value ?? fallback);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.trunc(parsed));
};

const limitNumber = (value: unknown): number => {
  const parsed = Number(value ?? 20);
  if (!Number.isFinite(parsed)) return 20;
  return Math.min(Math.max(1, Math.trunc(parsed)), 100);
};

const booleanOrUndefined = (value: unknown): boolean | undefined => {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return undefined;
  if (value.toLowerCase() === "true") return true;
  if (value.toLowerCase() === "false") return false;
  return undefined;
};

export const normalizeIncomeFilters = (input: IncomeFilterInput = {}): IncomeFilters => ({
  from: stringOrUndefined(input.from),
  to: stringOrUndefined(input.to),
  method: stringOrUndefined(input.method),
  companyPaymentAccountId: stringOrUndefined(input.companyPaymentAccountId),
  saleOrderId: stringOrUndefined(input.saleOrderId),
  client: stringOrUndefined(input.client),
  q: stringOrUndefined(input.q),
  hasEvidence: booleanOrUndefined(input.hasEvidence),
  page: pageNumber(input.page, 1),
  limit: limitNumber(input.limit),
});
