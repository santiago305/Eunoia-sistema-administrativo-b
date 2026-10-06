export interface IncomeFilterInput {
  from?: string;
  to?: string;
  method?: string;
  companyPaymentAccountId?: string;
  saleOrderId?: string;
  client?: string;
  q?: string;
  hasEvidence?: boolean | string;
  status?: "POSTED" | "VOIDED" | "ALL" | string;
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
  status: "POSTED" | "VOIDED" | "ALL";
  page: number;
  limit: number;
}

const stringOrUndefined = (value?: string | null): string | undefined => {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
};

const dateOrUndefined = (value?: string | null): string | undefined => {
  const normalized = stringOrUndefined(value);
  if (!normalized) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return undefined;
  const parsed = new Date(`${normalized}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== normalized ? undefined : normalized;
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

export const normalizeIncomeFilters = (input: IncomeFilterInput = {}): IncomeFilters => {
  const from = dateOrUndefined(input.from);
  const to = dateOrUndefined(input.to);
  return {
  from,
  to,
  method: stringOrUndefined(input.method),
  companyPaymentAccountId: stringOrUndefined(input.companyPaymentAccountId),
  saleOrderId: stringOrUndefined(input.saleOrderId),
  client: stringOrUndefined(input.client),
  q: stringOrUndefined(input.q),
  hasEvidence: booleanOrUndefined(input.hasEvidence),
  status: input.status === "VOIDED" || input.status === "ALL" ? input.status : "POSTED",
  page: pageNumber(input.page, 1),
  limit: limitNumber(input.limit),
  };
};
