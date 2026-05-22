import { ListingSearchOptionOutput } from "src/shared/listing-search/application/dtos/listing-search-state.output";
import { ClientDocType } from "src/modules/clients/domain/object-values/client-doc-type";
import { ClientType } from "src/modules/clients/domain/object-values/client-type";
import {
  ClientSearchField,
  ClientSearchFields,
  ClientSearchIsActiveValue,
  ClientSearchIsActiveValues,
  ClientSearchOperator,
  ClientSearchOperators,
  ClientSearchRule,
  ClientSearchRuleMode,
  ClientSearchSnapshot,
} from "../dtos/client-search/client-search-snapshot";

type SearchCatalogMaps = {
  activeStates?: Map<string, string>;
  docTypes?: Map<string, string>;
  clientTypes?: Map<string, string>;
  departments?: Map<string, string>;
  provinces?: Map<string, string>;
  districts?: Map<string, string>;
};

const uniqueStrings = (values: string[] | undefined) =>
  Array.from(new Set((values ?? []).map((value) => value?.trim()).filter(Boolean))) as string[];

const FILTER_FIELD_ORDER: ClientSearchField[] = [
  ClientSearchFields.IS_ACTIVE,
  ClientSearchFields.DOC_TYPE,
  ClientSearchFields.TYPE,
  ClientSearchFields.DEPARTMENT_ID,
  ClientSearchFields.PROVINCE_ID,
  ClientSearchFields.DISTRICT_ID,
  ClientSearchFields.FULL_NAME,
  ClientSearchFields.DOC_NUMBER,
  ClientSearchFields.REFERENCE,
  ClientSearchFields.ADDRESS,
];

const CATALOG_FIELDS = new Set<ClientSearchField>([
  ClientSearchFields.TYPE,
  ClientSearchFields.DOC_TYPE,
  ClientSearchFields.DEPARTMENT_ID,
  ClientSearchFields.PROVINCE_ID,
  ClientSearchFields.DISTRICT_ID,
  ClientSearchFields.IS_ACTIVE,
]);

const TEXT_FIELDS = new Set<ClientSearchField>([
  ClientSearchFields.FULL_NAME,
  ClientSearchFields.DOC_NUMBER,
  ClientSearchFields.ADDRESS,
  ClientSearchFields.REFERENCE,
]);

const TEXT_OPERATORS = new Set<ClientSearchOperator>([
  ClientSearchOperators.CONTAINS,
  ClientSearchOperators.EQ,
]);

const SEARCH_FIELD_LABELS: Record<ClientSearchField, string> = {
  [ClientSearchFields.IS_ACTIVE]: "Estado",
  [ClientSearchFields.DOC_TYPE]: "Tipo doc",
  [ClientSearchFields.TYPE]: "Tipo cliente",
  [ClientSearchFields.DEPARTMENT_ID]: "Departamento",
  [ClientSearchFields.PROVINCE_ID]: "Provincia",
  [ClientSearchFields.DISTRICT_ID]: "Distrito",
  [ClientSearchFields.FULL_NAME]: "Nombre",
  [ClientSearchFields.DOC_NUMBER]: "Nro doc",
  [ClientSearchFields.REFERENCE]: "Referencia",
  [ClientSearchFields.ADDRESS]: "Direccion",
};

const SEARCH_OPERATOR_LABELS: Record<ClientSearchOperator, string> = {
  [ClientSearchOperators.IN]: ":",
  [ClientSearchOperators.CONTAINS]: "contiene",
  [ClientSearchOperators.EQ]: "=",
};

export const CLIENT_ACTIVE_STATE_SEARCH_OPTIONS: ListingSearchOptionOutput[] = [
  { id: ClientSearchIsActiveValues.ACTIVE, label: "Activos", keywords: ["activo", "habilitado"] },
  { id: ClientSearchIsActiveValues.INACTIVE, label: "Inactivos", keywords: ["inactivo", "deshabilitado"] },
];

export const CLIENT_DOC_TYPE_SEARCH_OPTIONS: ListingSearchOptionOutput[] = [
  { id: ClientDocType.DNI, label: "DNI" },
  { id: ClientDocType.CE, label: "CE" },
  { id: ClientDocType.RUC, label: "RUC" },
  { id: ClientDocType.NONE, label: "Sin documento" },
];

export const CLIENT_TYPE_SEARCH_OPTIONS: ListingSearchOptionOutput[] = [
  { id: ClientType.NEW, label: "Nuevo" },
  { id: ClientType.LAGGING, label: "Rezago" },
  { id: ClientType.REPURCHASE, label: "Recompra" },
  { id: ClientType.UNDEFINED, label: "Indefinido" },
];

export function normalizeSearchText(value: string | undefined | null) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function normalizeRuleMode(mode?: ClientSearchRuleMode | null): ClientSearchRuleMode {
  return mode === "exclude" ? "exclude" : "include";
}

function sanitizeSearchRule(rule?: Partial<ClientSearchRule> | null): ClientSearchRule | null {
  if (!rule?.field || !rule.operator) return null;

  const field = rule.field;
  const operator = rule.operator;

  if (!Object.values(ClientSearchFields).includes(field)) return null;
  if (!Object.values(ClientSearchOperators).includes(operator)) return null;

  if (CATALOG_FIELDS.has(field)) {
    if (operator !== ClientSearchOperators.IN) return null;
    const values = uniqueStrings(rule.values ?? (rule.value ? [rule.value] : undefined));
    if (!values.length) return null;
    const mode = normalizeRuleMode(rule.mode);

    if (field === ClientSearchFields.IS_ACTIVE) {
      const allowed = new Set(Object.values(ClientSearchIsActiveValues));
      const normalized = values.filter((value) => allowed.has(value as ClientSearchIsActiveValue));
      if (!normalized.length) return null;
      return { field, operator, mode, values: normalized };
    }

    if (field === ClientSearchFields.DOC_TYPE) {
      const allowed = new Set(Object.values(ClientDocType));
      const normalized = values.filter((value) => allowed.has(value as ClientDocType));
      if (!normalized.length) return null;
      return { field, operator, mode, values: normalized };
    }

    if (field === ClientSearchFields.TYPE) {
      const allowed = new Set(Object.values(ClientType));
      const normalized = values.filter((value) => allowed.has(value as ClientType));
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

export function sanitizeClientSearchFilters(filters?: ClientSearchRule[] | null): ClientSearchRule[] {
  const source = Array.isArray(filters) ? filters : [];
  const mergedByField = new Map<ClientSearchField, ClientSearchRule>();

  source.forEach((rule) => {
    const normalized = sanitizeSearchRule(rule);
    if (!normalized) return;

    const existing = mergedByField.get(normalized.field);
    if (normalized.operator === ClientSearchOperators.IN && existing?.operator === ClientSearchOperators.IN) {
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
    .filter(Boolean) as ClientSearchRule[];
}

export function sanitizeClientSearchSnapshot(snapshot?: Partial<ClientSearchSnapshot> | null): ClientSearchSnapshot {
  const q = snapshot?.q?.trim();
  return {
    q: q || undefined,
    filters: sanitizeClientSearchFilters(snapshot?.filters ?? []),
  };
}

export function hasClientSearchCriteria(snapshot?: Partial<ClientSearchSnapshot> | null) {
  const normalized = sanitizeClientSearchSnapshot(snapshot);
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

function getCatalogMap(field: ClientSearchField, maps: SearchCatalogMaps) {
  switch (field) {
    case ClientSearchFields.IS_ACTIVE:
      return maps.activeStates;
    case ClientSearchFields.DOC_TYPE:
      return maps.docTypes;
    case ClientSearchFields.TYPE:
      return maps.clientTypes;
    case ClientSearchFields.DEPARTMENT_ID:
      return maps.departments;
    case ClientSearchFields.PROVINCE_ID:
      return maps.provinces;
    case ClientSearchFields.DISTRICT_ID:
      return maps.districts;
    default:
      return undefined;
  }
}

export function buildClientSearchLabel(
  snapshot: ClientSearchSnapshot,
  maps: SearchCatalogMaps,
) {
  const normalized = sanitizeClientSearchSnapshot(snapshot);
  const parts: string[] = [];

  if (normalized.q) {
    parts.push(`Busqueda: ${normalized.q}`);
  }

  normalized.filters.forEach((rule) => {
    const label = SEARCH_FIELD_LABELS[rule.field];
    if (rule.operator === ClientSearchOperators.IN) {
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

