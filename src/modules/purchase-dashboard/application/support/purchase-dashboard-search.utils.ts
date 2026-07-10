import {
  PurchaseDashboardDateRangeSnapshot,
  PurchaseDashboardSearchField,
  PurchaseDashboardSearchFields,
  PurchaseDashboardSearchOperators,
  PurchaseDashboardSearchRule,
  PurchaseDashboardSearchSnapshot,
} from "../dtos/purchase-dashboard-search-snapshot";

const DASHBOARD_FILTER_FIELD_ORDER: PurchaseDashboardSearchField[] = [
  PurchaseDashboardSearchFields.PURCHASE_TYPE,
  PurchaseDashboardSearchFields.PAYMENT_STATUS,
  PurchaseDashboardSearchFields.SUPPLIER_ID,
  PurchaseDashboardSearchFields.USER_ID,
  PurchaseDashboardSearchFields.WAREHOUSE_ID,
  PurchaseDashboardSearchFields.PAYMENT_METHOD_ID,
  PurchaseDashboardSearchFields.COMPANY_PAYMENT_ACCOUNT_ID,
];

const uniqueStrings = (values: string[] | undefined) =>
  Array.from(new Set((values ?? []).map((value) => value?.trim()).filter(Boolean))) as string[];

function normalizeDateValue(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString().slice(0, 10);
}

function sanitizeDashboardSearchRule(
  rule?: Partial<PurchaseDashboardSearchRule> | null,
): PurchaseDashboardSearchRule | null {
  if (!rule?.field) return null;
  if (!Object.values(PurchaseDashboardSearchFields).includes(rule.field)) return null;
  if (rule.operator !== PurchaseDashboardSearchOperators.IN) return null;

  const values = uniqueStrings(rule.values);
  if (!values.length) return null;

  return {
    field: rule.field,
    operator: PurchaseDashboardSearchOperators.IN,
    values,
  };
}

function sanitizeDateRange(
  dateRange?: Partial<PurchaseDashboardDateRangeSnapshot> | null,
): PurchaseDashboardDateRangeSnapshot | undefined {
  if (dateRange?.mode !== "absolute") return undefined;

  const from = normalizeDateValue(dateRange.from);
  const to = normalizeDateValue(dateRange.to);
  if (!from && !to) return undefined;

  return {
    mode: "absolute",
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
  };
}

export function sanitizePurchaseDashboardSearchFilters(
  filters?: unknown,
): PurchaseDashboardSearchRule[] {
  const mergedByField = new Map<PurchaseDashboardSearchField, PurchaseDashboardSearchRule>();

  (Array.isArray(filters) ? filters : []).forEach((rule) => {
    const normalized = sanitizeDashboardSearchRule(rule as Partial<PurchaseDashboardSearchRule>);
    if (!normalized) return;

    const existing = mergedByField.get(normalized.field);
    mergedByField.set(normalized.field, {
      field: normalized.field,
      operator: PurchaseDashboardSearchOperators.IN,
      values: uniqueStrings([...(existing?.values ?? []), ...normalized.values]),
    });
  });

  return DASHBOARD_FILTER_FIELD_ORDER
    .map((field) => mergedByField.get(field))
    .filter(Boolean) as PurchaseDashboardSearchRule[];
}

export function sanitizePurchaseDashboardSearchSnapshot(
  snapshot?: unknown,
): PurchaseDashboardSearchSnapshot {
  const source = snapshot && typeof snapshot === "object"
    ? snapshot as Partial<PurchaseDashboardSearchSnapshot>
    : undefined;
  const dateRange = sanitizeDateRange(source?.dateRange);
  return {
    filters: sanitizePurchaseDashboardSearchFilters(source?.filters),
    ...(dateRange ? { dateRange } : {}),
  };
}

export function hasPurchaseDashboardSearchCriteria(
  snapshot?: unknown,
) {
  const normalized = sanitizePurchaseDashboardSearchSnapshot(snapshot);
  return Boolean(normalized.filters.length || normalized.dateRange);
}
