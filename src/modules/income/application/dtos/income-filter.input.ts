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
  filters?: string | IncomeSearchRule[];
  page?: number | string;
  limit?: number | string;
  requestedBy?: string;
}

import type {
  IncomeSearchField,
  IncomeSearchOperator,
  IncomeSearchRule,
} from "./income-search/income-search-snapshot";

export type { IncomeSearchField, IncomeSearchOperator, IncomeSearchRule } from "./income-search/income-search-snapshot";

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
  filters?: IncomeSearchRule[];
  page: number;
  limit: number;
}

const stringOrUndefined = (value?: string | null): string | undefined => {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
};

const dateOrUndefined = (value?: string | null): string | undefined => {
  const normalized = stringOrUndefined(value);
  if (!normalized || !/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return undefined;
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

const normalizeValues = (value: unknown): string[] => {
  const values = Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
  return [...new Set(values.map((item) => String(item).trim()).filter(Boolean))].slice(0, 50);
};

const parseRules = (value: IncomeFilterInput["filters"]): IncomeSearchRule[] => {
  let parsed: unknown = value;
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(parsed)) return [];

  const fieldAliases: Record<string, IncomeSearchField> = {
    method: "paymentMethodId",
    account: "companyPaymentAccountId",
  };
  const allowedFields = new Set<IncomeSearchField>([
    "status",
    "paymentMethodId",
    "detail",
    "companyPaymentAccountId",
    "hasEvidence",
  ]);
  const allowedOperators = new Set<IncomeSearchOperator>(["in", "contains", "eq"]);

  return parsed.slice(0, 20).flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const raw = item as Record<string, unknown>;
    const field = fieldAliases[String(raw.field ?? "")] ?? String(raw.field ?? "");
    const operator = String(raw.operator ?? "in") as IncomeSearchOperator;
    if (!allowedFields.has(field as IncomeSearchField) || !allowedOperators.has(operator)) return [];
    const values = normalizeValues(raw.values);
    const value = typeof raw.value === "string" ? raw.value.trim().slice(0, 200) : undefined;
    if (!values.length && !value) return [];
    return [{
      field: field as IncomeSearchField,
      operator,
      mode: raw.mode === "exclude" ? "exclude" : "include",
      ...(values.length ? { values } : {}),
      ...(value ? { value } : {}),
    }];
  });
};

const ruleValues = (rule?: IncomeSearchRule): string[] =>
  normalizeValues(rule?.values ?? (rule?.value ? [rule.value] : []));

export const normalizeIncomeFilters = (input: IncomeFilterInput = {}): IncomeFilters => {
  const parsedRules = parseRules(input.filters);
  const statusValues = ruleValues(parsedRules.find((rule) => rule.field === "status"))
    .filter((value): value is "POSTED" | "VOIDED" => value === "POSTED" || value === "VOIDED");
  const evidenceValues = ruleValues(parsedRules.find((rule) => rule.field === "hasEvidence"))
    .filter((value) => value === "true" || value === "false");
  const scalarStatus = input.status === "POSTED" || input.status === "VOIDED" || input.status === "ALL" ? input.status : "ALL";
  const status = statusValues.length === 1 ? statusValues[0] : statusValues.length > 1 ? "ALL" : scalarStatus;
  const hasEvidence = evidenceValues.length === 1 ? evidenceValues[0] === "true" : evidenceValues.length > 1 ? undefined : booleanOrUndefined(input.hasEvidence);

  return {
    from: dateOrUndefined(input.from),
    to: dateOrUndefined(input.to),
    method: stringOrUndefined(input.method),
    companyPaymentAccountId: stringOrUndefined(input.companyPaymentAccountId),
    saleOrderId: stringOrUndefined(input.saleOrderId),
    client: stringOrUndefined(input.client),
    q: stringOrUndefined(input.q)?.slice(0, 100),
    hasEvidence,
    status,
    filters: parsedRules.filter((rule) => rule.field !== "status" && rule.field !== "hasEvidence"),
    page: pageNumber(input.page, 1),
    limit: limitNumber(input.limit),
  };
};
