import { ListingSearchOptionOutput } from "src/shared/listing-search/application/dtos/listing-search-state.output";
import {
  SaleOrderPaymentStatusValue,
  SaleOrderPaymentStatusValues,
  SaleOrderSearchField,
  SaleOrderSearchFields,
  SaleOrderSearchOperator,
  SaleOrderSearchOperators,
  SaleOrderSearchRule,
  SaleOrderSearchRuleMode,
  SaleOrderSearchSnapshot,
} from "../dtos/sale-order-search/sale-order-search-snapshot";

type SearchCatalogMaps = {
  clients?: Map<string, string>;
  warehouses?: Map<string, string>;
  workflows?: Map<string, string>;
  states?: Map<string, string>;
  paymentStatuses?: Map<string, string>;
};

const uniqueStrings = (values: string[] | undefined) =>
  Array.from(new Set((values ?? []).map((value) => value?.trim()).filter(Boolean))) as string[];

const FILTER_FIELD_ORDER: SaleOrderSearchField[] = [
  SaleOrderSearchFields.NUMBER,
  SaleOrderSearchFields.CLIENT_ID,
  SaleOrderSearchFields.WAREHOUSE_ID,
  SaleOrderSearchFields.WORKFLOW_ID,
  SaleOrderSearchFields.SALE_ORDER_STATE_ID,
  SaleOrderSearchFields.PAYMENT_STATUS,
  SaleOrderSearchFields.SCHEDULE_DATE,
  SaleOrderSearchFields.DELIVERY_DATE,
];

const CATALOG_FIELDS = new Set<SaleOrderSearchField>([
  SaleOrderSearchFields.CLIENT_ID,
  SaleOrderSearchFields.WAREHOUSE_ID,
  SaleOrderSearchFields.WORKFLOW_ID,
  SaleOrderSearchFields.SALE_ORDER_STATE_ID,
  SaleOrderSearchFields.PAYMENT_STATUS,
]);

const DATE_FIELDS = new Set<SaleOrderSearchField>([
  SaleOrderSearchFields.SCHEDULE_DATE,
  SaleOrderSearchFields.DELIVERY_DATE,
]);

const TEXT_FIELDS = new Set<SaleOrderSearchField>([SaleOrderSearchFields.NUMBER]);

const DATE_OPERATORS = new Set<SaleOrderSearchOperator>([
  SaleOrderSearchOperators.ON,
  SaleOrderSearchOperators.BEFORE,
  SaleOrderSearchOperators.AFTER,
  SaleOrderSearchOperators.BETWEEN,
  SaleOrderSearchOperators.ON_OR_BEFORE,
  SaleOrderSearchOperators.ON_OR_AFTER,
]);

const TEXT_OPERATORS = new Set<SaleOrderSearchOperator>([
  SaleOrderSearchOperators.CONTAINS,
  SaleOrderSearchOperators.EQ,
]);

const SEARCH_FIELD_LABELS: Record<SaleOrderSearchField, string> = {
  [SaleOrderSearchFields.NUMBER]: "Numero",
  [SaleOrderSearchFields.CLIENT_ID]: "Cliente",
  [SaleOrderSearchFields.WAREHOUSE_ID]: "Almacen",
  [SaleOrderSearchFields.WORKFLOW_ID]: "Flujo",
  [SaleOrderSearchFields.SALE_ORDER_STATE_ID]: "Estado",
  [SaleOrderSearchFields.PAYMENT_STATUS]: "Pago",
  [SaleOrderSearchFields.SCHEDULE_DATE]: "F. Programada",
  [SaleOrderSearchFields.DELIVERY_DATE]: "F. Entrega",
};

const SEARCH_OPERATOR_LABELS: Record<SaleOrderSearchOperator, string> = {
  [SaleOrderSearchOperators.IN]: ":",
  [SaleOrderSearchOperators.CONTAINS]: "contiene",
  [SaleOrderSearchOperators.EQ]: "=",
  [SaleOrderSearchOperators.ON]: "=",
  [SaleOrderSearchOperators.BEFORE]: "<",
  [SaleOrderSearchOperators.AFTER]: ">",
  [SaleOrderSearchOperators.BETWEEN]: "entre",
  [SaleOrderSearchOperators.ON_OR_BEFORE]: "<=",
  [SaleOrderSearchOperators.ON_OR_AFTER]: ">=",
};

export const SALE_ORDER_PAYMENT_STATUS_SEARCH_OPTIONS: ListingSearchOptionOutput[] = [
  { id: SaleOrderPaymentStatusValues.PAID, label: "Pagado", keywords: ["pagado", "cancelado"] },
  { id: SaleOrderPaymentStatusValues.PENDING, label: "Pendiente", keywords: ["pendiente", "deuda"] },
];

export function normalizeSearchText(value: string | undefined | null) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function matchSearchOptionIds<T extends string>(
  query: string,
  options: Array<{ id: T; label: string; keywords?: string[] }>,
) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return [];

  return options
    .filter((option) => {
      const candidates = [option.id, option.label, ...(option.keywords ?? [])]
        .map((item) => normalizeSearchText(item))
        .filter(Boolean);

      return candidates.some((candidate) => candidate.includes(normalizedQuery) || normalizedQuery.includes(candidate));
    })
    .map((option) => option.id);
}

function normalizeRuleMode(mode?: SaleOrderSearchRuleMode | null): SaleOrderSearchRuleMode {
  return mode === "exclude" ? "exclude" : "include";
}

function normalizeDateValue(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return trimmed.slice(0, 10);
}

function orderDateRange(start: string, end: string) {
  return start <= end ? { start, end } : { start: end, end: start };
}

function sanitizeSearchRule(rule?: Partial<SaleOrderSearchRule> | null): SaleOrderSearchRule | null {
  if (!rule?.field || !rule.operator) return null;

  const field = rule.field;
  const operator = rule.operator;

  if (!Object.values(SaleOrderSearchFields).includes(field)) return null;
  if (!Object.values(SaleOrderSearchOperators).includes(operator)) return null;

  if (CATALOG_FIELDS.has(field)) {
    if (operator !== SaleOrderSearchOperators.IN) return null;
    const values = uniqueStrings(rule.values ?? (rule.value ? [rule.value] : undefined));
    if (!values.length) return null;
    const mode = normalizeRuleMode(rule.mode);

    if (field === SaleOrderSearchFields.PAYMENT_STATUS) {
      const allowed = new Set(Object.values(SaleOrderPaymentStatusValues));
      const normalizedValues = values.filter((value) => allowed.has(value as SaleOrderPaymentStatusValue));
      if (!normalizedValues.length) return null;
      return { field, operator, mode, values: normalizedValues };
    }

    return { field, operator, mode, values };
  }

  if (TEXT_FIELDS.has(field)) {
    if (!TEXT_OPERATORS.has(operator)) return null;
    const value = rule.value?.trim();
    if (!value) return null;
    return { field, operator, value };
  }

  if (DATE_FIELDS.has(field)) {
    if (!DATE_OPERATORS.has(operator)) return null;

    if (operator === SaleOrderSearchOperators.BETWEEN) {
      const start = normalizeDateValue(rule.range?.start ?? null);
      const end = normalizeDateValue(rule.range?.end ?? null);
      if (!start || !end) return null;
      return { field, operator, range: orderDateRange(start, end) };
    }

    const value = normalizeDateValue(rule.value ?? null);
    if (!value) return null;
    return { field, operator, value };
  }

  return null;
}

export function sanitizeSaleOrderSearchFilters(filters?: SaleOrderSearchRule[] | null): SaleOrderSearchRule[] {
  const source = Array.isArray(filters) ? filters : [];
  const mergedByField = new Map<SaleOrderSearchField, SaleOrderSearchRule>();

  source.forEach((rule) => {
    const normalized = sanitizeSearchRule(rule);
    if (!normalized) return;

    const existing = mergedByField.get(normalized.field);
    if (normalized.operator === SaleOrderSearchOperators.IN && existing?.operator === SaleOrderSearchOperators.IN) {
      mergedByField.set(normalized.field, {
        field: normalized.field,
        operator: normalized.operator,
        mode: normalizeRuleMode(normalized.mode ?? existing.mode),
        values: uniqueStrings([...(existing.values ?? []), ...(normalized.values ?? [])]),
      });
      return;
    }

    mergedByField.set(normalized.field, normalized);
  });

  return FILTER_FIELD_ORDER
    .map((field) => mergedByField.get(field))
    .filter(Boolean) as SaleOrderSearchRule[];
}

export function sanitizeSaleOrderSearchSnapshot(snapshot?: Partial<SaleOrderSearchSnapshot> | null): SaleOrderSearchSnapshot {
  const q = snapshot?.q?.trim();
  return {
    q: q || undefined,
    filters: sanitizeSaleOrderSearchFilters(snapshot?.filters ?? []),
  };
}

export function hasSaleOrderSearchCriteria(snapshot?: Partial<SaleOrderSearchSnapshot> | null) {
  const normalized = sanitizeSaleOrderSearchSnapshot(snapshot);
  return Boolean(normalized.q || normalized.filters.length);
}

function mapIdsToLabels(ids: string[], map?: Map<string, string>) {
  return ids.map((id) => map?.get(id) ?? id);
}

function getCatalogMap(field: SaleOrderSearchField, maps: SearchCatalogMaps) {
  switch (field) {
    case SaleOrderSearchFields.CLIENT_ID:
      return maps.clients;
    case SaleOrderSearchFields.WAREHOUSE_ID:
      return maps.warehouses;
    case SaleOrderSearchFields.WORKFLOW_ID:
      return maps.workflows;
    case SaleOrderSearchFields.SALE_ORDER_STATE_ID:
      return maps.states;
    case SaleOrderSearchFields.PAYMENT_STATUS:
      return maps.paymentStatuses;
    default:
      return undefined;
  }
}

export function buildSaleOrderSearchLabel(snapshot: SaleOrderSearchSnapshot, maps: SearchCatalogMaps) {
  const normalized = sanitizeSaleOrderSearchSnapshot(snapshot);
  const parts: string[] = [];

  if (normalized.q) {
    parts.push(`Busqueda: ${normalized.q}`);
  }

  normalized.filters.forEach((rule) => {
    const label = SEARCH_FIELD_LABELS[rule.field];
    if (rule.operator === SaleOrderSearchOperators.IN) {
      const values = mapIdsToLabels(rule.values ?? [], getCatalogMap(rule.field, maps));
      if (!values.length) return;
      parts.push(
        rule.mode === "exclude"
          ? `${label} excluye: ${values.join(" - ")}`
          : `${label}: ${values.join(" - ")}`,
      );
      return;
    }

    if (rule.operator === SaleOrderSearchOperators.BETWEEN) {
      const start = rule.range?.start;
      const end = rule.range?.end;
      if (!start || !end) return;
      parts.push(`${label} ${SEARCH_OPERATOR_LABELS[rule.operator]} ${start} - ${end}`);
      return;
    }

    if (!rule.value) return;
    parts.push(`${label} ${SEARCH_OPERATOR_LABELS[rule.operator]} ${rule.value}`);
  });

  return parts.join(" | ") || "Busqueda guardada";
}
