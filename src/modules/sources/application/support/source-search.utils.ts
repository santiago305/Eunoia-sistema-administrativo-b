import { ListingSearchOptionOutput } from "src/shared/listing-search/application/dtos/listing-search-state.output";
import {
  SourceSearchField,
  SourceSearchFields,
  SourceSearchIsActiveValue,
  SourceSearchIsActiveValues,
  SourceSearchOperator,
  SourceSearchOperators,
  SourceSearchRule,
  SourceSearchRuleMode,
  SourceSearchSnapshot,
} from "../dtos/source-search/source-search-snapshot";

type SearchCatalogMaps = {
  activeStates?: Map<string, string>;
};

const uniqueStrings = (values: string[] | undefined) =>
  Array.from(new Set((values ?? []).map((value) => value?.trim()).filter(Boolean))) as string[];

const FILTER_FIELD_ORDER: SourceSearchField[] = [
  SourceSearchFields.IS_ACTIVE,
  SourceSearchFields.NAME,
  SourceSearchFields.DETAIL,
];

const CATALOG_FIELDS = new Set<SourceSearchField>([
  SourceSearchFields.IS_ACTIVE,
]);

const TEXT_FIELDS = new Set<SourceSearchField>([
  SourceSearchFields.NAME,
  SourceSearchFields.DETAIL,
]);

const TEXT_OPERATORS = new Set<SourceSearchOperator>([
  SourceSearchOperators.CONTAINS,
  SourceSearchOperators.EQ,
]);

const SEARCH_FIELD_LABELS: Record<SourceSearchField, string> = {
  [SourceSearchFields.IS_ACTIVE]: "Estado",
  [SourceSearchFields.NAME]: "Nombre",
  [SourceSearchFields.DETAIL]: "Detalle",
};

const SEARCH_OPERATOR_LABELS: Record<SourceSearchOperator, string> = {
  [SourceSearchOperators.IN]: ":",
  [SourceSearchOperators.CONTAINS]: "contiene",
  [SourceSearchOperators.EQ]: "=",
};

export const SOURCE_ACTIVE_STATE_SEARCH_OPTIONS: ListingSearchOptionOutput[] = [
  { id: SourceSearchIsActiveValues.ACTIVE, label: "Activos", keywords: ["activo", "habilitado"] },
  { id: SourceSearchIsActiveValues.INACTIVE, label: "Inactivos", keywords: ["inactivo", "deshabilitado"] },
];

export function normalizeSearchText(value: string | undefined | null) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function normalizeRuleMode(mode?: SourceSearchRuleMode | null): SourceSearchRuleMode {
  return mode === "exclude" ? "exclude" : "include";
}

function sanitizeSearchRule(rule?: Partial<SourceSearchRule> | null): SourceSearchRule | null {
  if (!rule?.field || !rule.operator) return null;

  const field = rule.field;
  const operator = rule.operator;

  if (!Object.values(SourceSearchFields).includes(field)) return null;
  if (!Object.values(SourceSearchOperators).includes(operator)) return null;

  if (CATALOG_FIELDS.has(field)) {
    if (operator !== SourceSearchOperators.IN) return null;
    const values = uniqueStrings(rule.values ?? (rule.value ? [rule.value] : undefined));
    if (!values.length) return null;
    const mode = normalizeRuleMode(rule.mode);

    if (field === SourceSearchFields.IS_ACTIVE) {
      const allowed = new Set(Object.values(SourceSearchIsActiveValues));
      const normalized = values.filter((value) => allowed.has(value as SourceSearchIsActiveValue));
      if (!normalized.length) return null;
      return { field, operator, mode, values: normalized };
    }

    return { field, operator, mode, values };
  }

  if (TEXT_FIELDS.has(field)) {
    if (!TEXT_OPERATORS.has(operator)) return null;
    const value = rule.value?.trim();
    if (!value) return null;
    return { field, operator, value };
  }

  return null;
}

export function sanitizeSourceSearchFilters(filters?: SourceSearchRule[] | null): SourceSearchRule[] {
  const source = Array.isArray(filters) ? filters : [];
  const mergedByField = new Map<SourceSearchField, SourceSearchRule>();

  source.forEach((rule) => {
    const normalized = sanitizeSearchRule(rule);
    if (!normalized) return;

    const existing = mergedByField.get(normalized.field);
    if (normalized.operator === SourceSearchOperators.IN && existing?.operator === SourceSearchOperators.IN) {
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
    .filter(Boolean) as SourceSearchRule[];
}

export function sanitizeSourceSearchSnapshot(snapshot?: Partial<SourceSearchSnapshot> | null): SourceSearchSnapshot {
  const q = snapshot?.q?.trim();
  return {
    q: q || undefined,
    filters: sanitizeSourceSearchFilters(snapshot?.filters ?? []),
  };
}

export function hasSourceSearchCriteria(snapshot?: Partial<SourceSearchSnapshot> | null) {
  const normalized = sanitizeSourceSearchSnapshot(snapshot);
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

function getCatalogMap(field: SourceSearchField, maps: SearchCatalogMaps) {
  switch (field) {
    case SourceSearchFields.IS_ACTIVE:
      return maps.activeStates;
    default:
      return undefined;
  }
}

export function buildSourceSearchLabel(snapshot: SourceSearchSnapshot, maps: SearchCatalogMaps) {
  const normalized = sanitizeSourceSearchSnapshot(snapshot);
  const parts: string[] = [];

  if (normalized.q) {
    parts.push(`Busqueda: ${normalized.q}`);
  }

  normalized.filters.forEach((rule) => {
    const label = SEARCH_FIELD_LABELS[rule.field];
    if (rule.operator === SourceSearchOperators.IN) {
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

