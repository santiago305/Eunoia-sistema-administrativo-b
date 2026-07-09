import { ListingSearchOptionOutput } from "src/shared/listing-search/application/dtos/listing-search-state.output";
import { ClientType } from "src/modules/clients/domain/object-values/client-type";
import {
  SaleOrderPaymentStatusValue,
  SaleOrderPaymentStatusValues,
  SaleOrderInvoiceStatusValues,
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
  creators?: Map<string, string>;
  assignees?: Map<string, string>;
  warehouses?: Map<string, string>;
  workflows?: Map<string, string>;
  states?: Map<string, string>;
  bankAccounts?: Map<string, string>;
  clientTypes?: Map<string, string>;
  paymentStatuses?: Map<string, string>;
  departments?: Map<string, string>;
  provinces?: Map<string, string>;
  districts?: Map<string, string>;
  sources?: Map<string, string>;
  invoiceStatuses?: Map<string, string>;
};

const uniqueStrings = (values: string[] | undefined) =>
  Array.from(new Set((values ?? []).map((value) => value?.trim()).filter(Boolean))) as string[];

const FILTER_FIELD_ORDER: SaleOrderSearchField[] = [
  SaleOrderSearchFields.NUMBER,
  SaleOrderSearchFields.CLIENT_ID,
  SaleOrderSearchFields.CREATED_BY,
  SaleOrderSearchFields.ASSIGNED_BY,
  SaleOrderSearchFields.WAREHOUSE_ID,
  SaleOrderSearchFields.WORKFLOW_ID,
  SaleOrderSearchFields.SALE_ORDER_STATE_ID,
  SaleOrderSearchFields.BANK_ACCOUNT_ID,
  SaleOrderSearchFields.CLIENT_TYPE,
  SaleOrderSearchFields.PAYMENT_STATUS,
  SaleOrderSearchFields.CLIENT_DEPARTMENT_ID,
  SaleOrderSearchFields.CLIENT_PROVINCE_ID,
  SaleOrderSearchFields.CLIENT_DISTRICT_ID,
  SaleOrderSearchFields.CLIENT_PHONE,
  SaleOrderSearchFields.AGENCY_DETAIL,
  SaleOrderSearchFields.SOURCE_ID,
  SaleOrderSearchFields.INVOICE_STATUS,
  SaleOrderSearchFields.SCHEDULE_DATE,
  SaleOrderSearchFields.DELIVERY_DATE,
  SaleOrderSearchFields.CREATED_AT,
  SaleOrderSearchFields.ADVERTISING_CODE,
  SaleOrderSearchFields.OBSERVATION,
];

const CATALOG_FIELDS = new Set<SaleOrderSearchField>([
  SaleOrderSearchFields.CLIENT_ID,
  SaleOrderSearchFields.CREATED_BY,
  SaleOrderSearchFields.ASSIGNED_BY,
  SaleOrderSearchFields.WAREHOUSE_ID,
  SaleOrderSearchFields.WORKFLOW_ID,
  SaleOrderSearchFields.SALE_ORDER_STATE_ID,
  SaleOrderSearchFields.BANK_ACCOUNT_ID,
  SaleOrderSearchFields.CLIENT_TYPE,
  SaleOrderSearchFields.PAYMENT_STATUS,
  SaleOrderSearchFields.CLIENT_DEPARTMENT_ID,
  SaleOrderSearchFields.CLIENT_PROVINCE_ID,
  SaleOrderSearchFields.CLIENT_DISTRICT_ID,
  SaleOrderSearchFields.SOURCE_ID,
  SaleOrderSearchFields.INVOICE_STATUS,
]);

const DATE_FIELDS = new Set<SaleOrderSearchField>([
  SaleOrderSearchFields.SCHEDULE_DATE,
  SaleOrderSearchFields.DELIVERY_DATE,
  SaleOrderSearchFields.CREATED_AT,
]);

const TEXT_FIELDS = new Set<SaleOrderSearchField>([
  SaleOrderSearchFields.NUMBER,
  SaleOrderSearchFields.ADVERTISING_CODE,
  SaleOrderSearchFields.OBSERVATION,
  SaleOrderSearchFields.CLIENT_PHONE,
  SaleOrderSearchFields.AGENCY_DETAIL,
]);

const DATE_OPERATORS = new Set<SaleOrderSearchOperator>([
  SaleOrderSearchOperators.ON,
  SaleOrderSearchOperators.BEFORE,
  SaleOrderSearchOperators.AFTER,
  SaleOrderSearchOperators.BETWEEN,
  SaleOrderSearchOperators.ON_OR_BEFORE,
  SaleOrderSearchOperators.ON_OR_AFTER,
  SaleOrderSearchOperators.IN_MONTH,
  SaleOrderSearchOperators.IN_WEEK,
]);

const TEXT_OPERATORS = new Set<SaleOrderSearchOperator>([
  SaleOrderSearchOperators.CONTAINS,
  SaleOrderSearchOperators.EQ,
]);

const SEARCH_FIELD_LABELS: Record<SaleOrderSearchField, string> = {
  [SaleOrderSearchFields.NUMBER]: "Numero",
  [SaleOrderSearchFields.CLIENT_ID]: "Cliente",
  [SaleOrderSearchFields.CREATED_BY]: "Creado por",
  [SaleOrderSearchFields.ASSIGNED_BY]: "Asignado a",
  [SaleOrderSearchFields.WAREHOUSE_ID]: "Almacen",
  [SaleOrderSearchFields.WORKFLOW_ID]: "Tipo",
  [SaleOrderSearchFields.SALE_ORDER_STATE_ID]: "Estado",
  [SaleOrderSearchFields.BANK_ACCOUNT_ID]: "Cuenta",
  [SaleOrderSearchFields.CLIENT_TYPE]: "Tipo cliente",
  [SaleOrderSearchFields.PAYMENT_STATUS]: "Pago",
  [SaleOrderSearchFields.CLIENT_DEPARTMENT_ID]: "Departamento",
  [SaleOrderSearchFields.CLIENT_PROVINCE_ID]: "Provincia",
  [SaleOrderSearchFields.CLIENT_DISTRICT_ID]: "Distrito",
  [SaleOrderSearchFields.CLIENT_PHONE]: "Celular",
  [SaleOrderSearchFields.AGENCY_DETAIL]: "Agencia",
  [SaleOrderSearchFields.SOURCE_ID]: "Origen",
  [SaleOrderSearchFields.INVOICE_STATUS]: "Comprobante",
  [SaleOrderSearchFields.SCHEDULE_DATE]: "F. Programada",
  [SaleOrderSearchFields.DELIVERY_DATE]: "F. Entrega",
  [SaleOrderSearchFields.CREATED_AT]: "F. Creacion",
  [SaleOrderSearchFields.ADVERTISING_CODE]: "Codigo publicitario",
  [SaleOrderSearchFields.OBSERVATION]: "Observacion",
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
  [SaleOrderSearchOperators.IN_MONTH]: "en el mes",
  [SaleOrderSearchOperators.IN_WEEK]: "en la semana",
};

export const SALE_ORDER_PAYMENT_STATUS_SEARCH_OPTIONS: ListingSearchOptionOutput[] = [
  { id: SaleOrderPaymentStatusValues.PAID, label: "Pagado", keywords: ["pagado", "cancelado"] },
  { id: SaleOrderPaymentStatusValues.PENDING, label: "Pendiente", keywords: ["pendiente", "deuda"] },
];

export const SALE_ORDER_CLIENT_TYPE_SEARCH_OPTIONS: ListingSearchOptionOutput[] = [
  { id: ClientType.NEW, label: "Nuevo", keywords: ["nuevo"] },
  { id: ClientType.LAGGING, label: "Rezagado", keywords: ["rezagado"] },
  { id: ClientType.REPURCHASE, label: "Recompra", keywords: ["recompra"] },
  { id: ClientType.UNDEFINED, label: "Sin definir", keywords: ["sin definir"] },
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

const MONTH_LABELS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "setiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

const SHORT_MONTH_LABELS = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "set",
  "oct",
  "nov",
  "dic",
];

function normalizeMonthValue(value?: string | null) {
  const match = /^(\d{4})-(\d{2})$/.exec(value?.trim() ?? "");
  if (!match) return undefined;
  const month = Number(match[2]);
  return month >= 1 && month <= 12 ? `${match[1]}-${match[2]}` : undefined;
}

function parseStrictDateOnly(value?: string | null) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value?.trim() ?? "");
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  return parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
    ? parsed
    : null;
}

function getUtcDateKey(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeWeekValue(value?: string | null) {
  const parsed = parseStrictDateOnly(value);
  if (!parsed) return undefined;

  const weekday = parsed.getUTCDay();
  const mondayOffset = weekday === 0 ? 6 : weekday - 1;
  parsed.setUTCDate(parsed.getUTCDate() - mondayOffset);
  return getUtcDateKey(parsed);
}

export function getSaleOrderMonthRange(value?: string | null) {
  const normalized = normalizeMonthValue(value);
  if (!normalized) return null;

  const [year, month] = normalized.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return {
    start: `${normalized}-01`,
    end: `${normalized}-${String(lastDay).padStart(2, "0")}`,
  };
}

export function getSaleOrderCalendarWeekRange(value?: string | null) {
  const normalized = normalizeWeekValue(value);
  const start = parseStrictDateOnly(normalized);
  if (!normalized || !start) return null;

  const end = new Date(start.getTime());
  end.setUTCDate(end.getUTCDate() + 6);
  return { start: normalized, end: getUtcDateKey(end) };
}

function formatMonthValue(value: string) {
  const normalized = normalizeMonthValue(value);
  if (!normalized) return "";
  const [year, month] = normalized.split("-").map(Number);
  return `${MONTH_LABELS[month - 1]} ${year}`;
}

function formatWeekValue(value: string) {
  const range = getSaleOrderCalendarWeekRange(value);
  if (!range) return "";

  const start = parseStrictDateOnly(range.start)!;
  const end = parseStrictDateOnly(range.end)!;
  const sameYear = start.getUTCFullYear() === end.getUTCFullYear();
  const startLabel = `${start.getUTCDate()} ${SHORT_MONTH_LABELS[start.getUTCMonth()]}${
    sameYear ? "" : ` ${start.getUTCFullYear()}`
  }`;
  const endLabel = `${end.getUTCDate()} ${SHORT_MONTH_LABELS[end.getUTCMonth()]} ${end.getUTCFullYear()}`;
  return `${startLabel} - ${endLabel}`;
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

    if (field === SaleOrderSearchFields.CLIENT_TYPE) {
      const allowed = new Set(Object.values(ClientType));
      const normalizedValues = values.filter((value) => allowed.has(value as ClientType));
      if (!normalizedValues.length) return null;
      return { field, operator, mode, values: normalizedValues };
    }

    if (field === SaleOrderSearchFields.INVOICE_STATUS) {
      const allowed = new Set(Object.values(SaleOrderInvoiceStatusValues));
      const normalizedValues = values.filter((value) => allowed.has(
        value as typeof SaleOrderInvoiceStatusValues[keyof typeof SaleOrderInvoiceStatusValues],
      ));
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

    if (operator === SaleOrderSearchOperators.IN_MONTH) {
      const value = normalizeMonthValue(rule.value);
      return value ? { field, operator, value } : null;
    }

    if (operator === SaleOrderSearchOperators.IN_WEEK) {
      const value = normalizeWeekValue(rule.value);
      return value ? { field, operator, value } : null;
    }

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
    case SaleOrderSearchFields.CREATED_BY:
      return maps.creators;
    case SaleOrderSearchFields.ASSIGNED_BY:
      return maps.assignees;
    case SaleOrderSearchFields.WAREHOUSE_ID:
      return maps.warehouses;
    case SaleOrderSearchFields.WORKFLOW_ID:
      return maps.workflows;
    case SaleOrderSearchFields.SALE_ORDER_STATE_ID:
      return maps.states;
    case SaleOrderSearchFields.BANK_ACCOUNT_ID:
      return maps.bankAccounts;
    case SaleOrderSearchFields.CLIENT_TYPE:
      return maps.clientTypes;
    case SaleOrderSearchFields.PAYMENT_STATUS:
      return maps.paymentStatuses;
    case SaleOrderSearchFields.CLIENT_DEPARTMENT_ID:
      return maps.departments;
    case SaleOrderSearchFields.CLIENT_PROVINCE_ID:
      return maps.provinces;
    case SaleOrderSearchFields.CLIENT_DISTRICT_ID:
      return maps.districts;
    case SaleOrderSearchFields.SOURCE_ID:
      return maps.sources;
    case SaleOrderSearchFields.INVOICE_STATUS:
      return maps.invoiceStatuses;
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

    if (
      rule.operator === SaleOrderSearchOperators.IN_MONTH &&
      rule.value
    ) {
      const month = formatMonthValue(rule.value);
      if (month) parts.push(`${label} en ${month}`);
      return;
    }

    if (
      rule.operator === SaleOrderSearchOperators.IN_WEEK &&
      rule.value
    ) {
      const week = formatWeekValue(rule.value);
      if (week) parts.push(`${label} en la semana ${week}`);
      return;
    }

    if (!rule.value) return;
    parts.push(`${label} ${SEARCH_OPERATOR_LABELS[rule.operator]} ${rule.value}`);
  });

  return parts.join(" | ") || "Busqueda guardada";
}
