import { createHash } from "crypto";
import { ListingSearchOptionOutput } from "src/shared/listing-search/application/dtos/listing-search-state.output";
import {
  LegacyWarehouseSearchFilters,
  WarehouseSearchField,
  WarehouseSearchFields,
  WarehouseSearchIsActiveValue,
  WarehouseSearchIsActiveValues,
  WarehouseSearchOperator,
  WarehouseSearchOperators,
  WarehouseSearchRule,
  WarehouseSearchRuleMode,
  WarehouseSearchSnapshot,
} from "../dtos/warehouse-search/warehouse-search-snapshot";

type SearchCatalogMaps = {
  activeStates?: Map<string, string>;
  departments?: Map<string, string>;
  provinces?: Map<string, string>;
  districts?: Map<string, string>;
};

const uniqueStrings = (values: string[] | undefined) =>
  Array.from(new Set((values ?? []).map((value) => value?.trim()).filter(Boolean))) as string[];

const FILTER_FIELD_ORDER: WarehouseSearchField[] = [
  WarehouseSearchFields.IS_ACTIVE,
  WarehouseSearchFields.DEPARTMENT,
  WarehouseSearchFields.PROVINCE,
  WarehouseSearchFields.DISTRICT,
  WarehouseSearchFields.NAME,
  WarehouseSearchFields.ADDRESS,
];

const CATALOG_FIELDS = new Set<WarehouseSearchField>([
  WarehouseSearchFields.IS_ACTIVE,
  WarehouseSearchFields.DEPARTMENT,
  WarehouseSearchFields.PROVINCE,
  WarehouseSearchFields.DISTRICT,
]);

const TEXT_FIELDS = new Set<WarehouseSearchField>([
  WarehouseSearchFields.NAME,
  WarehouseSearchFields.ADDRESS,
]);

const TEXT_OPERATORS = new Set<WarehouseSearchOperator>([
  WarehouseSearchOperators.CONTAINS,
  WarehouseSearchOperators.EQ,
]);

const SEARCH_FIELD_LABELS: Record<WarehouseSearchField, string> = {
  [WarehouseSearchFields.IS_ACTIVE]: "Estado",
  [WarehouseSearchFields.NAME]: "Nombre",
  [WarehouseSearchFields.DEPARTMENT]: "Departamento",
  [WarehouseSearchFields.PROVINCE]: "Provincia",
  [WarehouseSearchFields.DISTRICT]: "Distrito",
  [WarehouseSearchFields.ADDRESS]: "Direccion",
};

const SEARCH_OPERATOR_LABELS: Record<WarehouseSearchOperator, string> = {
  [WarehouseSearchOperators.IN]: ":",
  [WarehouseSearchOperators.CONTAINS]: "contiene",
  [WarehouseSearchOperators.EQ]: "=",
};

export const WAREHOUSE_ACTIVE_STATE_SEARCH_OPTIONS: ListingSearchOptionOutput[] = [
  { id: WarehouseSearchIsActiveValues.ACTIVE, label: "Activos", keywords: ["activo", "habilitado"] },
  { id: WarehouseSearchIsActiveValues.INACTIVE, label: "Inactivos", keywords: ["inactivo", "deshabilitado"] },
];

export function normalizeSearchText(value: string | undefined | null) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function isLegacyFilters(value: unknown): value is Partial<LegacyWarehouseSearchFilters> {
  return Boolean(value) && !Array.isArray(value) && typeof value === "object";
}

function normalizeRuleMode(mode?: WarehouseSearchRuleMode | null): WarehouseSearchRuleMode {
  return mode === "exclude" ? "exclude" : "include";
}

function legacyFiltersToRules(filters?: Partial<LegacyWarehouseSearchFilters> | null): WarehouseSearchRule[] {
  if (!filters) return [];

  const rules: WarehouseSearchRule[] = [];

  const activeStates = uniqueStrings(filters.isActiveValues as string[] | undefined);
  if (activeStates.length) {
    rules.push({
      field: WarehouseSearchFields.IS_ACTIVE,
      operator: WarehouseSearchOperators.IN,
      values: activeStates,
    });
  }

  const catalogFields: Array<[WarehouseSearchField, string[] | undefined]> = [
    [WarehouseSearchFields.DEPARTMENT, filters.departments],
    [WarehouseSearchFields.PROVINCE, filters.provinces],
    [WarehouseSearchFields.DISTRICT, filters.districts],
  ];

  catalogFields.forEach(([field, values]) => {
    const normalized = uniqueStrings(values);
    if (!normalized.length) return;
    rules.push({
      field,
      operator: WarehouseSearchOperators.IN,
      values: normalized,
    });
  });

  const textFields: Array<[WarehouseSearchField, string | undefined]> = [
    [WarehouseSearchFields.NAME, filters.name],
    [WarehouseSearchFields.ADDRESS, filters.address],
  ];

  textFields.forEach(([field, value]) => {
    const normalizedValue = value?.trim();
    if (!normalizedValue) return;
    rules.push({
      field,
      operator: WarehouseSearchOperators.CONTAINS,
      value: normalizedValue,
    });
  });

  return rules;
}

function sanitizeSearchRule(rule?: Partial<WarehouseSearchRule> | null): WarehouseSearchRule | null {
  if (!rule?.field || !rule.operator) return null;

  const field = rule.field;
  const operator = rule.operator;

  if (!Object.values(WarehouseSearchFields).includes(field)) return null;
  if (!Object.values(WarehouseSearchOperators).includes(operator)) return null;

  if (CATALOG_FIELDS.has(field)) {
    if (operator !== WarehouseSearchOperators.IN) return null;
    const values = uniqueStrings(rule.values ?? (rule.value ? [rule.value] : undefined));
    if (!values.length) return null;
    const mode = normalizeRuleMode(rule.mode);

    if (field === WarehouseSearchFields.IS_ACTIVE) {
      const allowed = new Set(Object.values(WarehouseSearchIsActiveValues));
      const normalized = values.filter((value) => allowed.has(value as WarehouseSearchIsActiveValue));
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

export function sanitizeWarehouseSearchFilters(
  filters?: WarehouseSearchRule[] | Partial<LegacyWarehouseSearchFilters> | null,
): WarehouseSearchRule[] {
  const source = Array.isArray(filters)
    ? filters
    : isLegacyFilters(filters)
      ? legacyFiltersToRules(filters)
      : [];

  const mergedByField = new Map<WarehouseSearchField, WarehouseSearchRule>();

  source.forEach((rule) => {
    const normalized = sanitizeSearchRule(rule);
    if (!normalized) return;

    const existing = mergedByField.get(normalized.field);
    if (normalized.operator === WarehouseSearchOperators.IN && existing?.operator === WarehouseSearchOperators.IN) {
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
    .filter(Boolean) as WarehouseSearchRule[];
}

export function sanitizeWarehouseSearchSnapshot(
  snapshot?: Partial<WarehouseSearchSnapshot> | null,
): WarehouseSearchSnapshot {
  const q = snapshot?.q?.trim();
  return {
    q: q || undefined,
    filters: sanitizeWarehouseSearchFilters(snapshot?.filters),
  };
}

export function hasWarehouseSearchCriteria(snapshot?: Partial<WarehouseSearchSnapshot> | null) {
  const normalized = sanitizeWarehouseSearchSnapshot(snapshot);
  return Boolean(normalized.q || normalized.filters.length);
}

export function createWarehouseSearchSnapshotHash(snapshot: WarehouseSearchSnapshot) {
  const normalized = sanitizeWarehouseSearchSnapshot(snapshot);
  return createHash("sha256")
    .update(JSON.stringify(normalized))
    .digest("hex");
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

      return candidates.some(
        (candidate) =>
          candidate.includes(normalizedQuery) || normalizedQuery.includes(candidate),
      );
    })
    .map((option) => option.id);
}

function mapIdsToLabels(ids: string[], map?: Map<string, string>) {
  return ids.map((id) => map?.get(id) ?? id);
}

function getCatalogMap(field: WarehouseSearchField, maps: SearchCatalogMaps) {
  switch (field) {
    case WarehouseSearchFields.IS_ACTIVE:
      return maps.activeStates;
    case WarehouseSearchFields.DEPARTMENT:
      return maps.departments;
    case WarehouseSearchFields.PROVINCE:
      return maps.provinces;
    case WarehouseSearchFields.DISTRICT:
      return maps.districts;
    default:
      return undefined;
  }
}

export function buildWarehouseSearchLabel(
  snapshot: WarehouseSearchSnapshot,
  maps: SearchCatalogMaps,
) {
  const normalized = sanitizeWarehouseSearchSnapshot(snapshot);
  const parts: string[] = [];

  if (normalized.q) {
    parts.push(`Busqueda: ${normalized.q}`);
  }

  normalized.filters.forEach((rule) => {
    const label = SEARCH_FIELD_LABELS[rule.field];
    if (rule.operator === WarehouseSearchOperators.IN) {
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
