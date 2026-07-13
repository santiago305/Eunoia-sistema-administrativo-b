import { createHash } from "crypto";
import { CurrencyType } from "src/modules/payments/domain/value-objects/currency-type";
import { PayDocType } from "src/modules/payments/domain/value-objects/pay-doc-type";
import {
  PaymentSearchField,
  PaymentSearchFields,
  PaymentSearchOperator,
  PaymentSearchOperators,
  PaymentSearchRule,
  PaymentSearchRuleMode,
  PaymentSearchSnapshot,
} from "../dtos/payment-search/payment-search-snapshot";
import { PaymentSearchOptionOutput } from "../dtos/payment-search/output/payment-search-state.output";

type SearchCatalogMaps = {
  statuses?: Map<string, string>;
  currencies?: Map<string, string>;
  documentTypes?: Map<string, string>;
  evidenceStates?: Map<string, string>;
  paymentMethods?: Map<string, string>;
  companyPaymentAccounts?: Map<string, string>;
};

const uniqueStrings = (values: string[] | undefined) =>
  Array.from(new Set((values ?? []).map((value) => value?.trim()).filter(Boolean))) as string[];

const FILTER_FIELD_ORDER: PaymentSearchField[] = [
  PaymentSearchFields.STATUS,
  PaymentSearchFields.CURRENCY,
  PaymentSearchFields.PAYMENT_METHOD_ID,
  PaymentSearchFields.COMPANY_PAYMENT_ACCOUNT_ID,
  PaymentSearchFields.FROM_DOCUMENT_TYPE,
  PaymentSearchFields.AMOUNT,
  PaymentSearchFields.DATE,
  PaymentSearchFields.SCHEDULED_AT,
  PaymentSearchFields.PAID_AT,
  PaymentSearchFields.HAS_EVIDENCE,
  PaymentSearchFields.REQUESTED_BY_USER_ID,
  PaymentSearchFields.APPROVED_BY_USER_ID,
];

const CATALOG_FIELDS = new Set<PaymentSearchField>([
  PaymentSearchFields.STATUS,
  PaymentSearchFields.CURRENCY,
  PaymentSearchFields.PAYMENT_METHOD_ID,
  PaymentSearchFields.COMPANY_PAYMENT_ACCOUNT_ID,
  PaymentSearchFields.FROM_DOCUMENT_TYPE,
  PaymentSearchFields.HAS_EVIDENCE,
  PaymentSearchFields.REQUESTED_BY_USER_ID,
  PaymentSearchFields.APPROVED_BY_USER_ID,
]);

const NUMERIC_FIELDS = new Set<PaymentSearchField>([PaymentSearchFields.AMOUNT]);

const DATE_FIELDS = new Set<PaymentSearchField>([
  PaymentSearchFields.DATE,
  PaymentSearchFields.SCHEDULED_AT,
  PaymentSearchFields.PAID_AT,
]);

const NUMERIC_OPERATORS = new Set<PaymentSearchOperator>([
  PaymentSearchOperators.EQ,
  PaymentSearchOperators.GT,
  PaymentSearchOperators.GTE,
  PaymentSearchOperators.LT,
  PaymentSearchOperators.LTE,
]);

const DATE_OPERATORS = new Set<PaymentSearchOperator>([
  PaymentSearchOperators.ON,
  PaymentSearchOperators.BEFORE,
  PaymentSearchOperators.AFTER,
  PaymentSearchOperators.BETWEEN,
  PaymentSearchOperators.ON_OR_BEFORE,
  PaymentSearchOperators.ON_OR_AFTER,
]);

const SEARCH_FIELD_LABELS: Record<PaymentSearchField, string> = {
  [PaymentSearchFields.STATUS]: "Estado",
  [PaymentSearchFields.CURRENCY]: "Moneda",
  [PaymentSearchFields.PAYMENT_METHOD_ID]: "Metodo",
  [PaymentSearchFields.COMPANY_PAYMENT_ACCOUNT_ID]: "Cuenta empresa",
  [PaymentSearchFields.FROM_DOCUMENT_TYPE]: "Origen",
  [PaymentSearchFields.AMOUNT]: "Monto",
  [PaymentSearchFields.DATE]: "Fecha documento",
  [PaymentSearchFields.SCHEDULED_AT]: "Fecha programada",
  [PaymentSearchFields.PAID_AT]: "Fecha pagada",
  [PaymentSearchFields.HAS_EVIDENCE]: "Evidencia",
  [PaymentSearchFields.REQUESTED_BY_USER_ID]: "Solicitante",
  [PaymentSearchFields.APPROVED_BY_USER_ID]: "Aprobador",
};

const SEARCH_OPERATOR_LABELS: Record<PaymentSearchOperator, string> = {
  [PaymentSearchOperators.IN]: ":",
  [PaymentSearchOperators.EQ]: "=",
  [PaymentSearchOperators.GT]: ">",
  [PaymentSearchOperators.GTE]: ">=",
  [PaymentSearchOperators.LT]: "<",
  [PaymentSearchOperators.LTE]: "<=",
  [PaymentSearchOperators.ON]: "=",
  [PaymentSearchOperators.BEFORE]: "<",
  [PaymentSearchOperators.AFTER]: ">",
  [PaymentSearchOperators.BETWEEN]: "entre",
  [PaymentSearchOperators.ON_OR_BEFORE]: "<=",
  [PaymentSearchOperators.ON_OR_AFTER]: ">=",
};

export const PAYMENT_STATUS_SEARCH_OPTIONS: PaymentSearchOptionOutput[] = [
  { id: "SCHEDULED", label: "Programado", keywords: ["programado", "agenda"] },
  { id: "PENDING_APPROVAL", label: "Pendiente aprobacion", keywords: ["pendiente", "aprobar"] },
  { id: "APPROVED", label: "Aprobado", keywords: ["pagado", "aprobado"] },
  { id: "REJECTED", label: "Rechazado", keywords: ["rechazado", "observado"] },
];

export const PAYMENT_CURRENCY_SEARCH_OPTIONS: PaymentSearchOptionOutput[] = [
  { id: CurrencyType.PEN, label: "Soles", keywords: ["pen", "soles"] },
  { id: CurrencyType.USD, label: "Dolares", keywords: ["usd", "dolares"] },
];

export const PAYMENT_DOCUMENT_TYPE_SEARCH_OPTIONS: PaymentSearchOptionOutput[] = [
  { id: PayDocType.PURCHASE, label: "Compra", keywords: ["purchase", "compra"] },
  { id: PayDocType.SALE, label: "Venta", keywords: ["sale", "venta"] },
];

export const PAYMENT_EVIDENCE_SEARCH_OPTIONS: PaymentSearchOptionOutput[] = [
  { id: "true", label: "Con evidencia", keywords: ["comprobante", "voucher"] },
  { id: "false", label: "Sin evidencia", keywords: ["pendiente evidencia"] },
];

function normalizeDateValue(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString().slice(0, 10);
}

function normalizeRuleMode(mode?: PaymentSearchRuleMode | null): PaymentSearchRuleMode {
  return mode === "exclude" ? "exclude" : "include";
}

function orderDateRange(start: string, end: string) {
  return start <= end ? { start, end } : { start: end, end: start };
}

function sanitizeSearchRule(rule?: Partial<PaymentSearchRule> | null): PaymentSearchRule | null {
  if (!rule?.field || !rule.operator) return null;

  const field = rule.field;
  const operator = rule.operator;

  if (!Object.values(PaymentSearchFields).includes(field)) return null;
  if (!Object.values(PaymentSearchOperators).includes(operator)) return null;

  if (CATALOG_FIELDS.has(field)) {
    if (operator !== PaymentSearchOperators.IN) return null;
    const values = uniqueStrings(rule.values ?? (rule.value ? [rule.value] : undefined));
    if (!values.length) return null;
    return {
      field,
      operator,
      mode: normalizeRuleMode(rule.mode),
      values,
    };
  }

  if (NUMERIC_FIELDS.has(field)) {
    if (!NUMERIC_OPERATORS.has(operator)) return null;
    const value = rule.value?.trim();
    if (!value || Number.isNaN(Number(value))) return null;
    return { field, operator, value };
  }

  if (DATE_FIELDS.has(field)) {
    if (!DATE_OPERATORS.has(operator)) return null;

    if (operator === PaymentSearchOperators.BETWEEN) {
      const start = normalizeDateValue(rule.range?.start);
      const end = normalizeDateValue(rule.range?.end);
      if (!start || !end) return null;
      return { field, operator, range: orderDateRange(start, end) };
    }

    const value = normalizeDateValue(rule.value);
    if (!value) return null;
    return { field, operator, value };
  }

  return null;
}

export function sanitizePaymentSearchFilters(filters?: PaymentSearchRule[] | null): PaymentSearchRule[] {
  const source = Array.isArray(filters) ? filters : [];
  const mergedByField = new Map<PaymentSearchField, PaymentSearchRule>();

  source.forEach((rule) => {
    const normalized = sanitizeSearchRule(rule);
    if (!normalized) return;

    const existing = mergedByField.get(normalized.field);
    if (normalized.operator === PaymentSearchOperators.IN && existing?.operator === PaymentSearchOperators.IN) {
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
    .filter(Boolean) as PaymentSearchRule[];
}

export function sanitizePaymentSearchSnapshot(
  snapshot?: Partial<PaymentSearchSnapshot> | null,
): PaymentSearchSnapshot {
  const q = snapshot?.q?.trim();
  return {
    q: q || undefined,
    filters: sanitizePaymentSearchFilters(snapshot?.filters),
  };
}

export function hasPaymentSearchCriteria(snapshot?: Partial<PaymentSearchSnapshot> | null) {
  const normalized = sanitizePaymentSearchSnapshot(snapshot);
  return Boolean(normalized.q || normalized.filters.length);
}

export function createPaymentSearchSnapshotHash(snapshot: PaymentSearchSnapshot) {
  const normalized = sanitizePaymentSearchSnapshot(snapshot);
  return createHash("sha256").update(JSON.stringify(normalized)).digest("hex");
}

function mapIdsToLabels(ids: string[], map?: Map<string, string>) {
  return ids.map((id) => map?.get(id) ?? id);
}

function getCatalogMap(field: PaymentSearchField, maps: SearchCatalogMaps) {
  switch (field) {
    case PaymentSearchFields.STATUS:
      return maps.statuses;
    case PaymentSearchFields.CURRENCY:
      return maps.currencies;
    case PaymentSearchFields.PAYMENT_METHOD_ID:
      return maps.paymentMethods;
    case PaymentSearchFields.COMPANY_PAYMENT_ACCOUNT_ID:
      return maps.companyPaymentAccounts;
    case PaymentSearchFields.FROM_DOCUMENT_TYPE:
      return maps.documentTypes;
    case PaymentSearchFields.HAS_EVIDENCE:
      return maps.evidenceStates;
    default:
      return undefined;
  }
}

export function buildPaymentSearchLabel(snapshot: PaymentSearchSnapshot, maps: SearchCatalogMaps) {
  const normalized = sanitizePaymentSearchSnapshot(snapshot);
  const parts: string[] = [];

  if (normalized.q) {
    parts.push(`Busqueda: ${normalized.q}`);
  }

  normalized.filters.forEach((rule) => {
    const label = SEARCH_FIELD_LABELS[rule.field];
    if (rule.operator === PaymentSearchOperators.IN) {
      const values = mapIdsToLabels(rule.values ?? [], getCatalogMap(rule.field, maps));
      if (!values.length) return;
      parts.push(
        rule.mode === "exclude"
          ? `${label} excluye: ${values.join(" - ")}`
          : `${label}: ${values.join(" - ")}`,
      );
      return;
    }

    if (rule.operator === PaymentSearchOperators.BETWEEN) {
      if (!rule.range?.start || !rule.range?.end) return;
      parts.push(`${label} entre ${rule.range.start} y ${rule.range.end}`);
      return;
    }

    if (!rule.value) return;
    parts.push(`${label} ${SEARCH_OPERATOR_LABELS[rule.operator]} ${rule.value}`);
  });

  return parts.join(" | ") || "Busqueda guardada";
}
