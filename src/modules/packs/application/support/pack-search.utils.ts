import { ListingSearchOptionOutput } from "src/shared/listing-search/application/dtos/listing-search-state.output";
import {
  PackSearchField,
  PackSearchFields,
  PackSearchIsActiveValue,
  PackSearchIsActiveValues,
  PackSearchOperator,
  PackSearchOperators,
  PackSearchRule,
  PackSearchRuleMode,
  PackSearchSnapshot,
} from "../dtos/pack-search/pack-search-snapshot";

type SearchCatalogMaps = {
  activeStates?: Map<string, string>;
};

const uniqueStrings = (values: string[] | undefined) =>
  Array.from(new Set((values ?? []).map((value) => value?.trim()).filter(Boolean))) as string[];

const FILTER_FIELD_ORDER: PackSearchField[] = [
  PackSearchFields.IS_ACTIVE,
  PackSearchFields.DESCRIPTION,
  PackSearchFields.TOTAL,
  PackSearchFields.SKU_TEXT,
];

const CATALOG_FIELDS = new Set<PackSearchField>([PackSearchFields.IS_ACTIVE]);

const TEXT_FIELDS = new Set<PackSearchField>([
  PackSearchFields.DESCRIPTION,
  PackSearchFields.SKU_TEXT,
]);

const TEXT_OPERATORS = new Set<PackSearchOperator>([
  PackSearchOperators.CONTAINS,
  PackSearchOperators.EQ,
]);

const NUMERIC_FIELDS = new Set<PackSearchField>([PackSearchFields.TOTAL]);

const NUMERIC_OPERATORS = new Set<PackSearchOperator>([
  PackSearchOperators.EQ,
  PackSearchOperators.GTE,
  PackSearchOperators.LTE,
]);

const SEARCH_FIELD_LABELS: Record<PackSearchField, string> = {
  [PackSearchFields.IS_ACTIVE]: "Estado",
  [PackSearchFields.DESCRIPTION]: "Descripcion",
  [PackSearchFields.TOTAL]: "Total",
  [PackSearchFields.SKU_TEXT]: "SKU",
};

const SEARCH_OPERATOR_LABELS: Record<PackSearchOperator, string> = {
  [PackSearchOperators.IN]: ":",
  [PackSearchOperators.CONTAINS]: "contiene",
  [PackSearchOperators.EQ]: "=",
  [PackSearchOperators.GTE]: ">=",
  [PackSearchOperators.LTE]: "<=",
};

export const PACK_ACTIVE_STATE_SEARCH_OPTIONS: ListingSearchOptionOutput[] = [
  { id: PackSearchIsActiveValues.ACTIVE, label: "Activos", keywords: ["activo", "habilitado"] },
  { id: PackSearchIsActiveValues.INACTIVE, label: "Inactivos", keywords: ["inactivo", "deshabilitado"] },
];

export function normalizeSearchText(value: string | undefined | null) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function normalizeRuleMode(mode?: PackSearchRuleMode | null): PackSearchRuleMode {
  return mode === "exclude" ? "exclude" : "include";
}

function isValidNumberString(value: string) {
  const normalized = value.trim();
  if (!normalized) return false;
  const asNumber = Number(normalized);
  return Number.isFinite(asNumber);
}

function sanitizeSearchRule(rule?: Partial<PackSearchRule> | null): PackSearchRule | null {
  if (!rule?.field || !rule.operator) return null;

  const field = rule.field;
  const operator = rule.operator;

  if (!Object.values(PackSearchFields).includes(field)) return null;
  if (!Object.values(PackSearchOperators).includes(operator)) return null;

  if (CATALOG_FIELDS.has(field)) {
    if (operator !== PackSearchOperators.IN) return null;
    const values = uniqueStrings(rule.values ?? (rule.value ? [rule.value] : undefined));
    if (!values.length) return null;
    const mode = normalizeRuleMode(rule.mode);

    if (field === PackSearchFields.IS_ACTIVE) {
      const allowed = new Set(Object.values(PackSearchIsActiveValues));
      const normalizedValues = values.filter((value) => allowed.has(value as PackSearchIsActiveValue));
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

  if (NUMERIC_FIELDS.has(field)) {
    if (!NUMERIC_OPERATORS.has(operator)) return null;
    const value = rule.value?.trim();
    if (!value || !isValidNumberString(value)) return null;
    return { field, operator, value };
  }

  return null;
}

export function sanitizePackSearchFilters(filters?: PackSearchRule[] | null): PackSearchRule[] {
  const source = Array.isArray(filters) ? filters : [];
  const mergedByField = new Map<PackSearchField, PackSearchRule>();

  source.forEach((rule) => {
    const normalized = sanitizeSearchRule(rule);
    if (!normalized) return;

    const existing = mergedByField.get(normalized.field);
    if (normalized.operator === PackSearchOperators.IN && existing?.operator === PackSearchOperators.IN) {
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
    .filter(Boolean) as PackSearchRule[];
}

export function sanitizePackSearchSnapshot(snapshot?: Partial<PackSearchSnapshot> | null): PackSearchSnapshot {
  const q = snapshot?.q?.trim();
  return {
    q: q || undefined,
    filters: sanitizePackSearchFilters(snapshot?.filters ?? []),
  };
}

export function hasPackSearchCriteria(snapshot?: Partial<PackSearchSnapshot> | null) {
  const normalized = sanitizePackSearchSnapshot(snapshot);
  return Boolean(normalized.q || normalized.filters.length);
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

function mapIdsToLabels(ids: string[], map?: Map<string, string>) {
  return ids.map((id) => map?.get(id) ?? id);
}

function getCatalogMap(field: PackSearchField, maps: SearchCatalogMaps) {
  switch (field) {
    case PackSearchFields.IS_ACTIVE:
      return maps.activeStates;
    default:
      return undefined;
  }
}

export function buildPackSearchLabel(snapshot: PackSearchSnapshot, maps: SearchCatalogMaps) {
  const normalized = sanitizePackSearchSnapshot(snapshot);
  const parts: string[] = [];

  if (normalized.q) {
    parts.push(`Busqueda: ${normalized.q}`);
  }

  normalized.filters.forEach((rule) => {
    const label = SEARCH_FIELD_LABELS[rule.field];
    if (rule.operator === PackSearchOperators.IN) {
      const values = mapIdsToLabels(rule.values ?? [], getCatalogMap(rule.field, maps));
      if (!values.length) return;
      parts.push(
        rule.mode === "exclude"
          ? `${label} excluye: ${values.join(" - ")}`
          : `${label}: ${values.join(" - ")}`,
      );
      return;
    }

    if (!rule.value) return;
    parts.push(`${label} ${SEARCH_OPERATOR_LABELS[rule.operator]} ${rule.value}`);
  });

  return parts.join(" | ") || "Busqueda guardada";
}

