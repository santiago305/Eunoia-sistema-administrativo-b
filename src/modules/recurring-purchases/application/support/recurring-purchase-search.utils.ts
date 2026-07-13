import {
  RecurringPurchaseSearchField,
  RecurringPurchaseSearchFields,
  RecurringPurchaseSearchOperator,
  RecurringPurchaseSearchOperators,
  RecurringPurchaseSearchRule,
  RecurringPurchaseSearchSnapshot,
} from "../dtos/recurring-purchase-search/recurring-purchase-search-snapshot";

export const RECURRING_PURCHASE_STATUS_SEARCH_OPTIONS = [
  { id: "ACTIVE", label: "Activa" },
  { id: "PAUSED", label: "Pausada" },
  { id: "CANCELLED", label: "Cancelada" },
];

export const RECURRING_PURCHASE_FREQUENCY_SEARCH_OPTIONS = [
  { id: "MONTHLY", label: "Mensual" },
  { id: "ANNUAL", label: "Anual" },
];

export const RECURRING_PURCHASE_TYPE_SEARCH_OPTIONS = [
  { id: "SERVICE", label: "Servicio" },
  { id: "SUBSCRIPTION", label: "Suscripcion" },
];

export const RECURRING_PURCHASE_CURRENCY_SEARCH_OPTIONS = [
  { id: "PEN", label: "PEN" },
  { id: "USD", label: "USD" },
];

export const RECURRING_PURCHASE_PAYMENT_STATUS_SEARCH_OPTIONS = [
  { id: "PENDING", label: "Pendiente" },
  { id: "PARTIAL", label: "Parcial" },
  { id: "PAID", label: "Pagado" },
  { id: "OVERDUE", label: "Vencido" },
];

const FIELD_ORDER: RecurringPurchaseSearchField[] = [
  RecurringPurchaseSearchFields.NEXT_DUE_DATE,
  RecurringPurchaseSearchFields.SUPPLIER_ID,
  RecurringPurchaseSearchFields.STATUS,
  RecurringPurchaseSearchFields.FREQUENCY,
  RecurringPurchaseSearchFields.CURRENCY,
  RecurringPurchaseSearchFields.PURCHASE_TYPE,
  RecurringPurchaseSearchFields.AMOUNT,
  RecurringPurchaseSearchFields.PAYMENT_STATUS,
  RecurringPurchaseSearchFields.START_DATE,
];

const FIELD_LABELS: Record<RecurringPurchaseSearchField, string> = {
  [RecurringPurchaseSearchFields.SUPPLIER_ID]: "Proveedor",
  [RecurringPurchaseSearchFields.STATUS]: "Estado",
  [RecurringPurchaseSearchFields.FREQUENCY]: "Frecuencia",
  [RecurringPurchaseSearchFields.PURCHASE_TYPE]: "Tipo",
  [RecurringPurchaseSearchFields.CURRENCY]: "Moneda",
  [RecurringPurchaseSearchFields.START_DATE]: "Inicio",
  [RecurringPurchaseSearchFields.NEXT_DUE_DATE]: "Vencimiento",
  [RecurringPurchaseSearchFields.AMOUNT]: "Monto",
  [RecurringPurchaseSearchFields.PAYMENT_STATUS]: "Estado de pago",
};

const CATALOG_FIELDS = new Set<RecurringPurchaseSearchField>([
  RecurringPurchaseSearchFields.SUPPLIER_ID,
  RecurringPurchaseSearchFields.STATUS,
  RecurringPurchaseSearchFields.FREQUENCY,
  RecurringPurchaseSearchFields.PURCHASE_TYPE,
  RecurringPurchaseSearchFields.CURRENCY,
  RecurringPurchaseSearchFields.PAYMENT_STATUS,
]);

const NUMERIC_FIELDS = new Set<RecurringPurchaseSearchField>([
  RecurringPurchaseSearchFields.AMOUNT,
]);

const DATE_FIELDS = new Set<RecurringPurchaseSearchField>([
  RecurringPurchaseSearchFields.START_DATE,
  RecurringPurchaseSearchFields.NEXT_DUE_DATE,
]);

const NUMERIC_OPERATORS = new Set<RecurringPurchaseSearchOperator>([
  RecurringPurchaseSearchOperators.EQ,
  RecurringPurchaseSearchOperators.GT,
  RecurringPurchaseSearchOperators.GTE,
  RecurringPurchaseSearchOperators.LT,
  RecurringPurchaseSearchOperators.LTE,
]);

const DATE_OPERATORS = new Set<RecurringPurchaseSearchOperator>([
  RecurringPurchaseSearchOperators.ON,
  RecurringPurchaseSearchOperators.AFTER,
  RecurringPurchaseSearchOperators.BEFORE,
  RecurringPurchaseSearchOperators.BETWEEN,
  RecurringPurchaseSearchOperators.ON_OR_AFTER,
  RecurringPurchaseSearchOperators.ON_OR_BEFORE,
]);

const OPERATOR_LABELS: Record<RecurringPurchaseSearchOperator, string> = {
  [RecurringPurchaseSearchOperators.IN]: ":",
  [RecurringPurchaseSearchOperators.CONTAINS]: "contiene",
  [RecurringPurchaseSearchOperators.EQ]: "=",
  [RecurringPurchaseSearchOperators.GT]: ">",
  [RecurringPurchaseSearchOperators.GTE]: ">=",
  [RecurringPurchaseSearchOperators.LT]: "<",
  [RecurringPurchaseSearchOperators.LTE]: "<=",
  [RecurringPurchaseSearchOperators.ON]: "=",
  [RecurringPurchaseSearchOperators.BEFORE]: "<",
  [RecurringPurchaseSearchOperators.AFTER]: ">",
  [RecurringPurchaseSearchOperators.BETWEEN]: "entre",
  [RecurringPurchaseSearchOperators.ON_OR_BEFORE]: "<=",
  [RecurringPurchaseSearchOperators.ON_OR_AFTER]: ">=",
};

type SearchCatalogMaps = {
  suppliers: Map<string, string>;
  statuses: Map<string, string>;
  frequencies: Map<string, string>;
  purchaseTypes: Map<string, string>;
  currencies: Map<string, string>;
  paymentStatuses: Map<string, string>;
};

function uniqueStrings(values: string[] | undefined) {
  return Array.from(new Set((values ?? []).map((value) => value?.trim()).filter(Boolean))) as string[];
}

function normalizeDateValue(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString().slice(0, 10);
}

function formatRuleValueLabel(value?: string | null) {
  const normalized = normalizeDateValue(value);
  if (!normalized) return value?.trim() ?? "";
  const [year, month, day] = normalized.split("-");
  return `${day}/${month}/${year}`;
}

function sanitizeRule(rule?: Partial<RecurringPurchaseSearchRule> | null): RecurringPurchaseSearchRule | null {
  if (!rule?.field || !rule.operator) return null;
  if (!Object.values(RecurringPurchaseSearchFields).includes(rule.field)) return null;
  if (!Object.values(RecurringPurchaseSearchOperators).includes(rule.operator)) return null;

  if (CATALOG_FIELDS.has(rule.field)) {
    if (rule.operator !== RecurringPurchaseSearchOperators.IN) return null;
    const values = uniqueStrings(rule.values ?? (rule.value ? [rule.value] : undefined));
    if (!values.length) return null;
    return {
      field: rule.field,
      operator: rule.operator,
      mode: rule.mode === "exclude" ? "exclude" : "include",
      values,
    };
  }

  if (NUMERIC_FIELDS.has(rule.field)) {
    if (!NUMERIC_OPERATORS.has(rule.operator)) return null;
    const value = rule.value?.trim();
    if (!value || Number.isNaN(Number(value))) return null;
    return { field: rule.field, operator: rule.operator, value };
  }

  if (DATE_FIELDS.has(rule.field)) {
    if (!DATE_OPERATORS.has(rule.operator)) return null;
    if (rule.operator === RecurringPurchaseSearchOperators.BETWEEN) {
      const start = normalizeDateValue(rule.range?.start);
      const end = normalizeDateValue(rule.range?.end);
      if (!start || !end) return null;
      return { field: rule.field, operator: rule.operator, range: { start, end } };
    }

    const value = normalizeDateValue(rule.value);
    if (!value) return null;
    return { field: rule.field, operator: rule.operator, value };
  }

  return null;
}

function getCatalogMap(field: RecurringPurchaseSearchField, maps: SearchCatalogMaps) {
  switch (field) {
    case RecurringPurchaseSearchFields.SUPPLIER_ID:
      return maps.suppliers;
    case RecurringPurchaseSearchFields.STATUS:
      return maps.statuses;
    case RecurringPurchaseSearchFields.FREQUENCY:
      return maps.frequencies;
    case RecurringPurchaseSearchFields.PURCHASE_TYPE:
      return maps.purchaseTypes;
    case RecurringPurchaseSearchFields.CURRENCY:
      return maps.currencies;
    case RecurringPurchaseSearchFields.PAYMENT_STATUS:
      return maps.paymentStatuses;
    default:
      return new Map<string, string>();
  }
}

function getRuleLabel(rule: RecurringPurchaseSearchRule, maps: SearchCatalogMaps, includeFieldLabel = true) {
  const fieldLabel = FIELD_LABELS[rule.field];

  if (rule.operator === RecurringPurchaseSearchOperators.IN) {
    const map = getCatalogMap(rule.field, maps);
    const content = (rule.values ?? []).map((value) => map.get(value) ?? value).join(" - ");
    const prefix = rule.mode === "exclude"
      ? includeFieldLabel ? `${fieldLabel} excluye: ` : "Excluye: "
      : includeFieldLabel ? `${fieldLabel}: ` : "";
    return `${prefix}${content}`;
  }

  if (rule.operator === RecurringPurchaseSearchOperators.BETWEEN) {
    if (!rule.range?.start || !rule.range?.end) return includeFieldLabel ? fieldLabel : "";
    const content = `${formatRuleValueLabel(rule.range.start)} y ${formatRuleValueLabel(rule.range.end)}`;
    return includeFieldLabel
      ? `${fieldLabel} ${OPERATOR_LABELS[rule.operator]} ${content}`
      : `${OPERATOR_LABELS[rule.operator]} ${content}`;
  }

  if (!rule.value) return includeFieldLabel ? fieldLabel : "";
  const content = `${OPERATOR_LABELS[rule.operator]} ${formatRuleValueLabel(rule.value)}`;
  return includeFieldLabel ? `${fieldLabel} ${content}` : content;
}

export function sanitizeRecurringPurchaseSearchFilters(filters?: Partial<RecurringPurchaseSearchRule>[] | null) {
  const mergedByField = new Map<RecurringPurchaseSearchField, RecurringPurchaseSearchRule>();

  (filters ?? []).forEach((rule) => {
    const normalized = sanitizeRule(rule);
    if (!normalized) return;

    const existing = mergedByField.get(normalized.field);
    if (
      normalized.operator === RecurringPurchaseSearchOperators.IN &&
      existing?.operator === RecurringPurchaseSearchOperators.IN
    ) {
      mergedByField.set(normalized.field, {
        field: normalized.field,
        operator: normalized.operator,
        mode: normalized.mode ?? existing.mode ?? "include",
        values: uniqueStrings([...(existing.values ?? []), ...(normalized.values ?? [])]),
      });
      return;
    }

    mergedByField.set(normalized.field, normalized);
  });

  return FIELD_ORDER.map((field) => mergedByField.get(field)).filter(Boolean) as RecurringPurchaseSearchRule[];
}

export function sanitizeRecurringPurchaseSearchSnapshot(
  snapshot?: Partial<RecurringPurchaseSearchSnapshot> | null,
): RecurringPurchaseSearchSnapshot {
  const q = snapshot?.q?.trim();
  return {
    q: q || undefined,
    filters: sanitizeRecurringPurchaseSearchFilters(snapshot?.filters),
  };
}

export function hasRecurringPurchaseSearchCriteria(snapshot?: Partial<RecurringPurchaseSearchSnapshot> | null) {
  const normalized = sanitizeRecurringPurchaseSearchSnapshot(snapshot);
  return Boolean(normalized.q || normalized.filters.length);
}

export function buildRecurringPurchaseSearchLabel(
  snapshot: RecurringPurchaseSearchSnapshot,
  maps: SearchCatalogMaps,
) {
  const normalized = sanitizeRecurringPurchaseSearchSnapshot(snapshot);
  const parts: string[] = [];

  if (normalized.q) {
    parts.push(`Busqueda: ${normalized.q}`);
  }

  normalized.filters.forEach((rule) => {
    const label = getRuleLabel(rule, maps);
    if (label) parts.push(label);
  });

  return parts.join(" | ") || "Busqueda guardada";
}
