import { ListingSearchOptionOutput } from "src/shared/listing-search/application/dtos/listing-search-state.output";
import {
  IncomeSearchField,
  IncomeSearchFields,
  IncomeSearchOperator,
  IncomeSearchOperators,
  IncomeSearchRule,
  IncomeSearchSnapshot,
} from "../dtos/income-search/income-search-snapshot";

type SearchCatalogMaps = {
  statuses?: Map<string, string>;
  methods?: Map<string, string>;
  accounts?: Map<string, string>;
  evidenceStates?: Map<string, string>;
};

const FILTER_FIELD_ORDER: IncomeSearchField[] = [
  IncomeSearchFields.STATUS,
  IncomeSearchFields.PAYMENT_METHOD_ID,
  IncomeSearchFields.DETAIL,
  IncomeSearchFields.COMPANY_PAYMENT_ACCOUNT_ID,
  IncomeSearchFields.HAS_EVIDENCE,
];

const CATALOG_FIELDS = new Set<IncomeSearchField>([
  IncomeSearchFields.STATUS,
  IncomeSearchFields.PAYMENT_METHOD_ID,
  IncomeSearchFields.COMPANY_PAYMENT_ACCOUNT_ID,
  IncomeSearchFields.HAS_EVIDENCE,
]);

const TEXT_FIELDS = new Set<IncomeSearchField>([IncomeSearchFields.DETAIL]);

const STATUS_OPTIONS: ListingSearchOptionOutput[] = [
  { id: "POSTED", label: "Contabilizado", keywords: ["contabilizado", "publicado"] },
  { id: "VOIDED", label: "Anulado", keywords: ["anulado", "cancelado"] },
];

const EVIDENCE_OPTIONS: ListingSearchOptionOutput[] = [
  { id: "true", label: "Con evidencia", keywords: ["comprobante", "adjunto"] },
  { id: "false", label: "Sin evidencia", keywords: ["pendiente", "faltante"] },
];

const uniqueStrings = (values: string[] | undefined) =>
  Array.from(new Set((values ?? []).map((value) => value?.trim()).filter(Boolean))) as string[];

const normalizeRuleMode = (mode?: IncomeSearchRule["mode"] | null): IncomeSearchRule["mode"] =>
  mode === "exclude" ? "exclude" : "include";

function sanitizeSearchRule(rule?: Partial<IncomeSearchRule> | null): IncomeSearchRule | null {
  if (!rule?.field || !rule.operator) return null;

  const field = rule.field as IncomeSearchField;
  const operator = rule.operator as IncomeSearchOperator;
  if (!Object.values(IncomeSearchFields).includes(field)) return null;
  if (!Object.values(IncomeSearchOperators).includes(operator)) return null;

  if (CATALOG_FIELDS.has(field)) {
    if (operator !== IncomeSearchOperators.IN) return null;
    const values = uniqueStrings(rule.values ?? (rule.value ? [rule.value] : undefined));
    if (!values.length) return null;

    if (field === IncomeSearchFields.STATUS) {
      const allowed = new Set(STATUS_OPTIONS.map((item) => item.id));
      const normalized = values.filter((value) => allowed.has(value));
      return normalized.length ? { field, operator, mode: normalizeRuleMode(rule.mode), values: normalized } : null;
    }

    if (field === IncomeSearchFields.HAS_EVIDENCE) {
      const allowed = new Set(EVIDENCE_OPTIONS.map((item) => item.id));
      const normalized = values.filter((value) => allowed.has(value));
      return normalized.length ? { field, operator, mode: normalizeRuleMode(rule.mode), values: normalized } : null;
    }

    return { field, operator, mode: normalizeRuleMode(rule.mode), values };
  }

  if (TEXT_FIELDS.has(field)) {
    if (operator !== IncomeSearchOperators.CONTAINS && operator !== IncomeSearchOperators.EQ) return null;
    const value = rule.value?.trim();
    return value ? { field, operator, value: value.slice(0, 200) } : null;
  }

  return null;
}

export function sanitizeIncomeSearchFilters(filters?: IncomeSearchRule[] | null): IncomeSearchRule[] {
  const mergedByField = new Map<IncomeSearchField, IncomeSearchRule>();

  (Array.isArray(filters) ? filters : []).forEach((rule) => {
    const normalized = sanitizeSearchRule(rule);
    if (!normalized) return;

    const existing = mergedByField.get(normalized.field);
    if (normalized.operator === IncomeSearchOperators.IN && existing?.operator === IncomeSearchOperators.IN) {
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

  return FILTER_FIELD_ORDER.map((field) => mergedByField.get(field)).filter(Boolean) as IncomeSearchRule[];
}

export function sanitizeIncomeSearchSnapshot(
  snapshot?: Partial<IncomeSearchSnapshot> | null,
): IncomeSearchSnapshot {
  const q = snapshot?.q?.trim();
  return {
    q: q ? q.slice(0, 100) : undefined,
    filters: sanitizeIncomeSearchFilters(snapshot?.filters),
  };
}

export function hasIncomeSearchCriteria(snapshot?: Partial<IncomeSearchSnapshot> | null) {
  const normalized = sanitizeIncomeSearchSnapshot(snapshot);
  return Boolean(normalized.q || normalized.filters.length);
}

function mapIdsToLabels(ids: string[], map?: Map<string, string>) {
  return ids.map((id) => map?.get(id) ?? id);
}

function getCatalogMap(field: IncomeSearchField, maps: SearchCatalogMaps) {
  switch (field) {
    case IncomeSearchFields.STATUS:
      return maps.statuses;
    case IncomeSearchFields.PAYMENT_METHOD_ID:
      return maps.methods;
    case IncomeSearchFields.COMPANY_PAYMENT_ACCOUNT_ID:
      return maps.accounts;
    case IncomeSearchFields.HAS_EVIDENCE:
      return maps.evidenceStates;
    default:
      return undefined;
  }
}

export function buildIncomeSearchLabel(snapshot: IncomeSearchSnapshot, maps: SearchCatalogMaps) {
  const normalized = sanitizeIncomeSearchSnapshot(snapshot);
  const parts: string[] = [];

  if (normalized.q) parts.push(`Busqueda: ${normalized.q}`);

  normalized.filters.forEach((rule) => {
    const label = {
      [IncomeSearchFields.STATUS]: "Estado",
      [IncomeSearchFields.PAYMENT_METHOD_ID]: "Metodo de pago",
      [IncomeSearchFields.DETAIL]: "Detalle",
      [IncomeSearchFields.COMPANY_PAYMENT_ACCOUNT_ID]: "Cuenta",
      [IncomeSearchFields.HAS_EVIDENCE]: "Evidencia",
    }[rule.field];

    if (rule.operator === IncomeSearchOperators.IN) {
      const values = mapIdsToLabels(rule.values ?? [], getCatalogMap(rule.field, maps));
      if (!values.length) return;
      parts.push(rule.mode === "exclude" ? `${label} excluye: ${values.join(" - ")}` : `${label}: ${values.join(" - ")}`);
      return;
    }

    if (!rule.value) return;
    parts.push(`${label} ${rule.operator === IncomeSearchOperators.EQ ? "=" : "contiene"} ${rule.value}`);
  });

  return parts.join(" | ") || "Busqueda guardada";
}

export const INCOME_STATUS_SEARCH_OPTIONS = STATUS_OPTIONS;
export const INCOME_EVIDENCE_SEARCH_OPTIONS = EVIDENCE_OPTIONS;
