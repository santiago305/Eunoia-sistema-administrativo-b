import { createHash } from "crypto";
import { ListingSearchOptionOutput } from "src/shared/listing-search/application/dtos/listing-search-state.output";
import { SupplierDocType } from "src/modules/suppliers/domain/object-values/supplier-doc-type";
import {
  LegacySupplierSearchFilters,
  SupplierSearchField,
  SupplierSearchFields,
  SupplierSearchIsActiveValue,
  SupplierSearchIsActiveValues,
  SupplierSearchOperator,
  SupplierSearchOperators,
  SupplierSearchRule,
  SupplierSearchRuleMode,
  SupplierSearchSnapshot,
} from "../dtos/supplier-search/supplier-search-snapshot";

type SearchCatalogMaps = {
  documentTypes?: Map<string, string>;
  activeStates?: Map<string, string>;
};

const uniqueStrings = (values: string[] | undefined) =>
  Array.from(new Set((values ?? []).map((value) => value?.trim()).filter(Boolean))) as string[];

const FILTER_FIELD_ORDER: SupplierSearchField[] = [
  SupplierSearchFields.DOCUMENT_TYPE,
  SupplierSearchFields.IS_ACTIVE,
  SupplierSearchFields.DOCUMENT_NUMBER,
  SupplierSearchFields.NAME,
  SupplierSearchFields.LAST_NAME,
  SupplierSearchFields.TRADE_NAME,
  SupplierSearchFields.PHONE,
  SupplierSearchFields.EMAIL,
];

const CATALOG_FIELDS = new Set<SupplierSearchField>([
  SupplierSearchFields.DOCUMENT_TYPE,
  SupplierSearchFields.IS_ACTIVE,
]);

const TEXT_FIELDS = new Set<SupplierSearchField>([
  SupplierSearchFields.DOCUMENT_NUMBER,
  SupplierSearchFields.NAME,
  SupplierSearchFields.LAST_NAME,
  SupplierSearchFields.TRADE_NAME,
  SupplierSearchFields.PHONE,
  SupplierSearchFields.EMAIL,
]);

const TEXT_OPERATORS = new Set<SupplierSearchOperator>([
  SupplierSearchOperators.CONTAINS,
  SupplierSearchOperators.EQ,
]);

const SEARCH_FIELD_LABELS: Record<SupplierSearchField, string> = {
  [SupplierSearchFields.DOCUMENT_TYPE]: "Tipo doc",
  [SupplierSearchFields.IS_ACTIVE]: "Estado",
  [SupplierSearchFields.DOCUMENT_NUMBER]: "Nro doc",
  [SupplierSearchFields.NAME]: "Nombre",
  [SupplierSearchFields.LAST_NAME]: "Apellido",
  [SupplierSearchFields.TRADE_NAME]: "Comercial",
  [SupplierSearchFields.PHONE]: "Telefono",
  [SupplierSearchFields.EMAIL]: "Correo",
};

const SEARCH_OPERATOR_LABELS: Record<SupplierSearchOperator, string> = {
  [SupplierSearchOperators.IN]: ":",
  [SupplierSearchOperators.CONTAINS]: "contiene",
  [SupplierSearchOperators.EQ]: "=",
};

export const SUPPLIER_DOCUMENT_TYPE_SEARCH_OPTIONS: ListingSearchOptionOutput[] = [
  { id: SupplierDocType.RUC, label: "RUC", keywords: ["06"] },
  { id: SupplierDocType.DNI, label: "DNI", keywords: ["01"] },
  { id: SupplierDocType.CE, label: "Carnet de extranjeria", keywords: ["04", "ce"] },
];

export const SUPPLIER_ACTIVE_STATE_SEARCH_OPTIONS: ListingSearchOptionOutput[] = [
  { id: SupplierSearchIsActiveValues.ACTIVE, label: "Activos", keywords: ["activo", "habilitado"] },
  { id: SupplierSearchIsActiveValues.INACTIVE, label: "Inactivos", keywords: ["inactivo", "deshabilitado"] },
];

export function normalizeSearchText(value: string | undefined | null) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function isLegacyFilters(value: unknown): value is Partial<LegacySupplierSearchFilters> {
  return Boolean(value) && !Array.isArray(value) && typeof value === "object";
}

function normalizeRuleMode(mode?: SupplierSearchRuleMode | null): SupplierSearchRuleMode {
  return mode === "exclude" ? "exclude" : "include";
}

function legacyFiltersToRules(filters?: Partial<LegacySupplierSearchFilters> | null): SupplierSearchRule[] {
  if (!filters) return [];

  const rules: SupplierSearchRule[] = [];

  const documentTypes = uniqueStrings(filters.documentTypes as string[] | undefined);
  if (documentTypes.length) {
    rules.push({
      field: SupplierSearchFields.DOCUMENT_TYPE,
      operator: SupplierSearchOperators.IN,
      values: documentTypes,
    });
  }

  const isActiveValues = uniqueStrings(filters.isActiveValues as string[] | undefined);
  if (isActiveValues.length) {
    rules.push({
      field: SupplierSearchFields.IS_ACTIVE,
      operator: SupplierSearchOperators.IN,
      values: isActiveValues,
    });
  }

  const textFields: Array<[SupplierSearchField, string | undefined]> = [
    [SupplierSearchFields.DOCUMENT_NUMBER, filters.documentNumber],
    [SupplierSearchFields.NAME, filters.name],
    [SupplierSearchFields.LAST_NAME, filters.lastName],
    [SupplierSearchFields.TRADE_NAME, filters.tradeName],
    [SupplierSearchFields.PHONE, filters.phone],
    [SupplierSearchFields.EMAIL, filters.email],
  ];

  textFields.forEach(([field, value]) => {
    const normalizedValue = value?.trim();
    if (!normalizedValue) return;
    rules.push({
      field,
      operator: SupplierSearchOperators.CONTAINS,
      value: normalizedValue,
    });
  });

  return rules;
}

function sanitizeSearchRule(rule?: Partial<SupplierSearchRule> | null): SupplierSearchRule | null {
  if (!rule?.field || !rule.operator) return null;

  const field = rule.field;
  const operator = rule.operator;

  if (!Object.values(SupplierSearchFields).includes(field)) return null;
  if (!Object.values(SupplierSearchOperators).includes(operator)) return null;

  if (CATALOG_FIELDS.has(field)) {
    if (operator !== SupplierSearchOperators.IN) return null;
    const values = uniqueStrings(rule.values ?? (rule.value ? [rule.value] : undefined));
    if (!values.length) return null;
    const mode = normalizeRuleMode(rule.mode);

    if (field === SupplierSearchFields.DOCUMENT_TYPE) {
      const allowed = new Set(Object.values(SupplierDocType));
      const normalized = values.filter((value) => allowed.has(value as SupplierDocType));
      if (!normalized.length) return null;
      return { field, operator, mode, values: normalized };
    }

    const allowed = new Set(Object.values(SupplierSearchIsActiveValues));
    const normalized = values.filter((value) => allowed.has(value as SupplierSearchIsActiveValue));
    if (!normalized.length) return null;
    return { field, operator, mode, values: normalized };
  }

  if (TEXT_FIELDS.has(field)) {
    if (!TEXT_OPERATORS.has(operator)) return null;
    const value = rule.value?.trim();
    if (!value) return null;
    return { field, operator, value };
  }

  return null;
}

export function sanitizeSupplierSearchFilters(
  filters?: SupplierSearchRule[] | Partial<LegacySupplierSearchFilters> | null,
): SupplierSearchRule[] {
  const source = Array.isArray(filters)
    ? filters
    : isLegacyFilters(filters)
      ? legacyFiltersToRules(filters)
      : [];

  const mergedByField = new Map<SupplierSearchField, SupplierSearchRule>();

  source.forEach((rule) => {
    const normalized = sanitizeSearchRule(rule);
    if (!normalized) return;

    const existing = mergedByField.get(normalized.field);
    if (normalized.operator === SupplierSearchOperators.IN && existing?.operator === SupplierSearchOperators.IN) {
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
    .filter(Boolean) as SupplierSearchRule[];
}

export function sanitizeSupplierSearchSnapshot(
  snapshot?: Partial<SupplierSearchSnapshot> | null,
): SupplierSearchSnapshot {
  const q = snapshot?.q?.trim();
  return {
    q: q || undefined,
    filters: sanitizeSupplierSearchFilters(snapshot?.filters),
  };
}

export function hasSupplierSearchCriteria(snapshot?: Partial<SupplierSearchSnapshot> | null) {
  const normalized = sanitizeSupplierSearchSnapshot(snapshot);
  return Boolean(normalized.q || normalized.filters.length);
}

export function createSupplierSearchSnapshotHash(snapshot: SupplierSearchSnapshot) {
  const normalized = sanitizeSupplierSearchSnapshot(snapshot);
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

function getCatalogMap(field: SupplierSearchField, maps: SearchCatalogMaps) {
  switch (field) {
    case SupplierSearchFields.DOCUMENT_TYPE:
      return maps.documentTypes;
    case SupplierSearchFields.IS_ACTIVE:
      return maps.activeStates;
    default:
      return undefined;
  }
}

export function buildSupplierSearchLabel(
  snapshot: SupplierSearchSnapshot,
  maps: SearchCatalogMaps,
) {
  const normalized = sanitizeSupplierSearchSnapshot(snapshot);
  const parts: string[] = [];

  if (normalized.q) {
    parts.push(`Busqueda: ${normalized.q}`);
  }

  normalized.filters.forEach((rule) => {
    const label = SEARCH_FIELD_LABELS[rule.field];
    if (rule.operator === SupplierSearchOperators.IN) {
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
