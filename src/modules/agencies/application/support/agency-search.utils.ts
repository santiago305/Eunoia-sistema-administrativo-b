import { ListingSearchOptionOutput } from "src/shared/listing-search/application/dtos/listing-search-state.output";
import {
  AgencySearchField,
  AgencySearchFields,
  AgencySearchIsActiveValue,
  AgencySearchIsActiveValues,
  AgencySearchOperator,
  AgencySearchOperators,
  AgencySearchRule,
  AgencySearchRuleMode,
  AgencySearchSnapshot,
} from "../dtos/agency-search/agency-search-snapshot";

type SearchCatalogMaps = {
  activeStates?: Map<string, string>;
  departments?: Map<string, string>;
  provinces?: Map<string, string>;
  districts?: Map<string, string>;
};

const uniqueStrings = (values: string[] | undefined) =>
  Array.from(new Set((values ?? []).map((value) => value?.trim()).filter(Boolean))) as string[];

const FILTER_FIELD_ORDER: AgencySearchField[] = [
  AgencySearchFields.IS_ACTIVE,
  AgencySearchFields.DEPARTMENT_ID,
  AgencySearchFields.PROVINCE_ID,
  AgencySearchFields.DISTRICT_ID,
  AgencySearchFields.NAME,
  AgencySearchFields.ALIAS,
  AgencySearchFields.ADDRESS,
];

const CATALOG_FIELDS = new Set<AgencySearchField>([
  AgencySearchFields.DEPARTMENT_ID,
  AgencySearchFields.PROVINCE_ID,
  AgencySearchFields.DISTRICT_ID,
  AgencySearchFields.IS_ACTIVE,
]);

const TEXT_FIELDS = new Set<AgencySearchField>([
  AgencySearchFields.NAME,
  AgencySearchFields.ALIAS,
  AgencySearchFields.ADDRESS,
]);

const TEXT_OPERATORS = new Set<AgencySearchOperator>([
  AgencySearchOperators.CONTAINS,
  AgencySearchOperators.EQ,
]);

const SEARCH_FIELD_LABELS: Record<AgencySearchField, string> = {
  [AgencySearchFields.IS_ACTIVE]: "Estado",
  [AgencySearchFields.DEPARTMENT_ID]: "Departamento",
  [AgencySearchFields.PROVINCE_ID]: "Provincia",
  [AgencySearchFields.DISTRICT_ID]: "Distrito",
  [AgencySearchFields.NAME]: "Nombre",
  [AgencySearchFields.ALIAS]: "Alias",
  [AgencySearchFields.ADDRESS]: "Direccion",
};

const SEARCH_OPERATOR_LABELS: Record<AgencySearchOperator, string> = {
  [AgencySearchOperators.IN]: ":",
  [AgencySearchOperators.CONTAINS]: "contiene",
  [AgencySearchOperators.EQ]: "=",
};

export const AGENCY_ACTIVE_STATE_SEARCH_OPTIONS: ListingSearchOptionOutput[] = [
  { id: AgencySearchIsActiveValues.ACTIVE, label: "Activos", keywords: ["activo", "habilitado"] },
  { id: AgencySearchIsActiveValues.INACTIVE, label: "Inactivos", keywords: ["inactivo", "deshabilitado"] },
];

export function normalizeSearchText(value: string | undefined | null) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function normalizeRuleMode(mode?: AgencySearchRuleMode | null): AgencySearchRuleMode {
  return mode === "exclude" ? "exclude" : "include";
}

function sanitizeSearchRule(rule?: Partial<AgencySearchRule> | null): AgencySearchRule | null {
  if (!rule?.field || !rule.operator) return null;

  const field = (rule.field as string) === "reference" ? AgencySearchFields.ALIAS : rule.field;
  const operator = rule.operator;

  if (!Object.values(AgencySearchFields).includes(field)) return null;
  if (!Object.values(AgencySearchOperators).includes(operator)) return null;

  if (CATALOG_FIELDS.has(field)) {
    if (operator !== AgencySearchOperators.IN) return null;
    const values = uniqueStrings(rule.values ?? (rule.value ? [rule.value] : undefined));
    if (!values.length) return null;
    const mode = normalizeRuleMode(rule.mode);

    if (field === AgencySearchFields.IS_ACTIVE) {
      const allowed = new Set(Object.values(AgencySearchIsActiveValues));
      const normalized = values.filter((value) => allowed.has(value as AgencySearchIsActiveValue));
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

export function sanitizeAgencySearchFilters(filters?: AgencySearchRule[] | null): AgencySearchRule[] {
  const source = Array.isArray(filters) ? filters : [];
  const mergedByField = new Map<AgencySearchField, AgencySearchRule>();

  source.forEach((rule) => {
    const normalized = sanitizeSearchRule(rule);
    if (!normalized) return;

    const existing = mergedByField.get(normalized.field);
    if (normalized.operator === AgencySearchOperators.IN && existing?.operator === AgencySearchOperators.IN) {
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
    .filter(Boolean) as AgencySearchRule[];
}

export function sanitizeAgencySearchSnapshot(snapshot?: Partial<AgencySearchSnapshot> | null): AgencySearchSnapshot {
  const q = snapshot?.q?.trim();
  return {
    q: q || undefined,
    filters: sanitizeAgencySearchFilters(snapshot?.filters ?? []),
  };
}

export function hasAgencySearchCriteria(snapshot?: Partial<AgencySearchSnapshot> | null) {
  const normalized = sanitizeAgencySearchSnapshot(snapshot);
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

function getCatalogMap(field: AgencySearchField, maps: SearchCatalogMaps) {
  switch (field) {
    case AgencySearchFields.IS_ACTIVE:
      return maps.activeStates;
    case AgencySearchFields.DEPARTMENT_ID:
      return maps.departments;
    case AgencySearchFields.PROVINCE_ID:
      return maps.provinces;
    case AgencySearchFields.DISTRICT_ID:
      return maps.districts;
    default:
      return undefined;
  }
}

export function buildAgencySearchLabel(snapshot: AgencySearchSnapshot, maps: SearchCatalogMaps) {
  const normalized = sanitizeAgencySearchSnapshot(snapshot);
  const parts: string[] = [];

  if (normalized.q) {
    parts.push(`Busqueda: ${normalized.q}`);
  }

  normalized.filters.forEach((rule) => {
    const label = SEARCH_FIELD_LABELS[rule.field];
    if (rule.operator === AgencySearchOperators.IN) {
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

