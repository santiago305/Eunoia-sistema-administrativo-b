import { createHash } from "crypto";
import { ListingSearchOptionOutput } from "src/shared/listing-search/application/dtos/listing-search-state.output";
import {
  ProductionStatusFilterOption,
  ProductionWarehouseFilterOption,
  ProductionProductFilterOption,
} from "../ports/production-filter-options.repository";
import { ProductionStatus } from "../../domain/value-objects/production-status.vo";
import {
  LegacyProductionSearchFilters,
  ProductionSearchField,
  ProductionSearchFields,
  ProductionSearchOperator,
  ProductionSearchOperators,
  ProductionSearchRule,
  ProductionSearchRuleMode,
  ProductionSearchSnapshot,
} from "../dto/production-search/production-search-snapshot";

type SearchCatalogMaps = {
  statuses?: Map<string, string>;
  warehouses?: Map<string, string>;
  products?: Map<string, string>;
};

const uniqueStrings = (values: string[] | undefined) =>
  Array.from(new Set((values ?? []).map((value) => value?.trim()).filter(Boolean))) as string[];

const FILTER_FIELD_ORDER: ProductionSearchField[] = [
  ProductionSearchFields.WAREHOUSE_ID,
  ProductionSearchFields.FROM_WAREHOUSE_ID,
  ProductionSearchFields.TO_WAREHOUSE_ID,
  ProductionSearchFields.STATUS,
  ProductionSearchFields.SKU_ID,
  ProductionSearchFields.NUMBER,
  ProductionSearchFields.REFERENCE,
  ProductionSearchFields.MANUFACTURE_DATE,
  ProductionSearchFields.CREATED_AT,
];

const CATALOG_FIELDS = new Set<ProductionSearchField>([
  ProductionSearchFields.WAREHOUSE_ID,
  ProductionSearchFields.FROM_WAREHOUSE_ID,
  ProductionSearchFields.TO_WAREHOUSE_ID,
  ProductionSearchFields.STATUS,
  ProductionSearchFields.SKU_ID,
]);

const TEXT_FIELDS = new Set<ProductionSearchField>([
  ProductionSearchFields.NUMBER,
  ProductionSearchFields.REFERENCE,
]);

const DATE_FIELDS = new Set<ProductionSearchField>([
  ProductionSearchFields.MANUFACTURE_DATE,
  ProductionSearchFields.CREATED_AT,
]);

const TEXT_OPERATORS = new Set<ProductionSearchOperator>([
  ProductionSearchOperators.CONTAINS,
  ProductionSearchOperators.EQ,
]);

const DATE_OPERATORS = new Set<ProductionSearchOperator>([
  ProductionSearchOperators.ON,
  ProductionSearchOperators.BEFORE,
  ProductionSearchOperators.AFTER,
  ProductionSearchOperators.BETWEEN,
  ProductionSearchOperators.ON_OR_BEFORE,
  ProductionSearchOperators.ON_OR_AFTER,
]);

const SEARCH_FIELD_LABELS: Record<ProductionSearchField, string> = {
  [ProductionSearchFields.WAREHOUSE_ID]: "Almacen",
  [ProductionSearchFields.FROM_WAREHOUSE_ID]: "Origen",
  [ProductionSearchFields.TO_WAREHOUSE_ID]: "Destino",
  [ProductionSearchFields.STATUS]: "Estado",
  [ProductionSearchFields.SKU_ID]: "Producto",
  [ProductionSearchFields.NUMBER]: "Numero",
  [ProductionSearchFields.REFERENCE]: "Referencia",
  [ProductionSearchFields.MANUFACTURE_DATE]: "F. Produccion",
  [ProductionSearchFields.CREATED_AT]: "Creacion",
};

const SEARCH_OPERATOR_LABELS: Record<ProductionSearchOperator, string> = {
  [ProductionSearchOperators.IN]: ":",
  [ProductionSearchOperators.CONTAINS]: "contiene",
  [ProductionSearchOperators.EQ]: "=",
  [ProductionSearchOperators.ON]: "=",
  [ProductionSearchOperators.BEFORE]: "<",
  [ProductionSearchOperators.AFTER]: ">",
  [ProductionSearchOperators.BETWEEN]: "entre",
  [ProductionSearchOperators.ON_OR_BEFORE]: "<=",
  [ProductionSearchOperators.ON_OR_AFTER]: ">=",
};

export const PRODUCTION_STATUS_OPTIONS: ProductionStatusFilterOption[] = [
  {
    value: ProductionStatus.DRAFT,
    label: "Borrador",
    order: 1,
    active: true,
    color: "slate",
  },
  {
    value: ProductionStatus.IN_PROGRESS,
    label: "En proceso",
    order: 2,
    active: true,
    color: "blue",
  },
  {
    value: ProductionStatus.PARTIAL,
    label: "Parcial",
    order: 3,
    active: true,
    color: "amber",
  },
  {
    value: ProductionStatus.COMPLETED,
    label: "Completado",
    order: 4,
    active: true,
    color: "green",
  },
  {
    value: ProductionStatus.CANCELLED,
    label: "Cancelado",
    order: 5,
    active: true,
    color: "red",
  },
];

export const PRODUCTION_STATUS_SEARCH_OPTIONS: ListingSearchOptionOutput[] = [
  { id: ProductionStatus.DRAFT, label: "Borrador", keywords: ["draft"] },
  { id: ProductionStatus.IN_PROGRESS, label: "En proceso", keywords: ["proceso", "in progress"] },
  { id: ProductionStatus.PARTIAL, label: "Parcial", keywords: ["partial"] },
  { id: ProductionStatus.COMPLETED, label: "Completado", keywords: ["completed", "finalizado"] },
  { id: ProductionStatus.CANCELLED, label: "Cancelado", keywords: ["cancelled", "anulado"] },
];

export function normalizeSearchText(value: string | undefined | null) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function normalizeRuleMode(mode?: ProductionSearchRuleMode | null): ProductionSearchRuleMode {
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

function buildDateRangeRules(filters?: LegacyProductionSearchFilters | null): ProductionSearchRule[] {
  const from = normalizeDateValue(filters?.from);
  const to = normalizeDateValue(filters?.to);
  if (!from && !to) return [];

  if (from && to) {
    return [{
      field: ProductionSearchFields.CREATED_AT,
      operator: ProductionSearchOperators.BETWEEN,
      range: orderDateRange(from, to),
    }];
  }

  return [{
    field: ProductionSearchFields.CREATED_AT,
    operator: from ? ProductionSearchOperators.ON_OR_AFTER : ProductionSearchOperators.ON_OR_BEFORE,
    value: from ?? to,
  }];
}

export function legacyProductionFiltersToRules(
  filters?: LegacyProductionSearchFilters | null,
): ProductionSearchRule[] {
  if (!filters) return [];

  const rules: ProductionSearchRule[] = [];

  if (filters.status) {
    rules.push({
      field: ProductionSearchFields.STATUS,
      operator: ProductionSearchOperators.IN,
      values: [filters.status],
    });
  }

  if (filters.warehouseId?.trim()) {
    rules.push({
      field: ProductionSearchFields.WAREHOUSE_ID,
      operator: ProductionSearchOperators.IN,
      values: [filters.warehouseId.trim()],
    });
  }

  if (filters.skuId?.trim()) {
    rules.push({
      field: ProductionSearchFields.SKU_ID,
      operator: ProductionSearchOperators.IN,
      values: [filters.skuId.trim()],
    });
  }

  rules.push(...buildDateRangeRules(filters));

  return rules;
}

function sanitizeSearchRule(rule?: Partial<ProductionSearchRule> | null): ProductionSearchRule | null {
  if (!rule?.field || !rule.operator) return null;

  const field = rule.field;
  const operator = rule.operator;

  if (!Object.values(ProductionSearchFields).includes(field)) return null;
  if (!Object.values(ProductionSearchOperators).includes(operator)) return null;

  if (CATALOG_FIELDS.has(field)) {
    if (operator !== ProductionSearchOperators.IN) return null;
    const values = uniqueStrings(rule.values ?? (rule.value ? [rule.value] : undefined));
    if (!values.length) return null;
    const mode = normalizeRuleMode(rule.mode);

    if (field === ProductionSearchFields.STATUS) {
      const allowed = new Set(Object.values(ProductionStatus));
      const normalized = values.filter((value) => allowed.has(value as ProductionStatus));
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

  if (DATE_FIELDS.has(field)) {
    if (!DATE_OPERATORS.has(operator)) return null;

    if (operator === ProductionSearchOperators.BETWEEN) {
      const start = normalizeDateValue(rule.range?.start);
      const end = normalizeDateValue(rule.range?.end);
      if (!start || !end) return null;
      return {
        field,
        operator,
        range: orderDateRange(start, end),
      };
    }

    const value = normalizeDateValue(rule.value);
    if (!value) return null;
    return { field, operator, value };
  }

  return null;
}

export function sanitizeProductionSearchFilters(
  filters?: ProductionSearchRule[] | null,
): ProductionSearchRule[] {
  const mergedByField = new Map<ProductionSearchField, ProductionSearchRule>();

  (filters ?? []).forEach((rule) => {
    const normalized = sanitizeSearchRule(rule);
    if (!normalized) return;

    const existing = mergedByField.get(normalized.field);
    if (
      normalized.operator === ProductionSearchOperators.IN &&
      existing?.operator === ProductionSearchOperators.IN
    ) {
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
    .filter(Boolean) as ProductionSearchRule[];
}

export function sanitizeProductionSearchSnapshot(
  snapshot?: Partial<ProductionSearchSnapshot> | null,
): ProductionSearchSnapshot {
  const q = snapshot?.q?.trim();
  return {
    q: q || undefined,
    filters: sanitizeProductionSearchFilters(snapshot?.filters),
  };
}

export function hasProductionSearchCriteria(snapshot?: Partial<ProductionSearchSnapshot> | null) {
  const normalized = sanitizeProductionSearchSnapshot(snapshot);
  return Boolean(normalized.q || normalized.filters.length);
}

export function createProductionSearchSnapshotHash(snapshot: ProductionSearchSnapshot) {
  const normalized = sanitizeProductionSearchSnapshot(snapshot);
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

function getCatalogMap(field: ProductionSearchField, maps: SearchCatalogMaps) {
  switch (field) {
    case ProductionSearchFields.WAREHOUSE_ID:
    case ProductionSearchFields.FROM_WAREHOUSE_ID:
    case ProductionSearchFields.TO_WAREHOUSE_ID:
      return maps.warehouses;
    case ProductionSearchFields.STATUS:
      return maps.statuses;
    case ProductionSearchFields.SKU_ID:
      return maps.products;
    default:
      return undefined;
  }
}

export function buildProductionSearchLabel(
  snapshot: ProductionSearchSnapshot,
  maps: SearchCatalogMaps,
) {
  const normalized = sanitizeProductionSearchSnapshot(snapshot);
  const parts: string[] = [];

  if (normalized.q) {
    parts.push(`Busqueda: ${normalized.q}`);
  }

  normalized.filters.forEach((rule) => {
    const label = SEARCH_FIELD_LABELS[rule.field];
    if (rule.operator === ProductionSearchOperators.IN) {
      const values = mapIdsToLabels(rule.values ?? [], getCatalogMap(rule.field, maps));
      if (!values.length) return;
      parts.push(
        rule.mode === "exclude"
          ? `${label} excluye: ${values.join(" - ")}`
          : `${label}: ${values.join(" - ")}`,
      );
      return;
    }

    if (rule.operator === ProductionSearchOperators.BETWEEN) {
      if (!rule.range?.start || !rule.range?.end) return;
      parts.push(`${label} entre ${rule.range.start} y ${rule.range.end}`);
      return;
    }

    if (!rule.value) return;
    parts.push(`${label} ${SEARCH_OPERATOR_LABELS[rule.operator]} ${rule.value}`);
  });

  return parts.join(" | ") || "Busqueda guardada";
}

export function buildProductionSearchMaps(params: {
  statuses: ProductionStatusFilterOption[];
  warehouses: ProductionWarehouseFilterOption[];
  products: ProductionProductFilterOption[];
}) {
  return {
    statuses: new Map(params.statuses.map((item) => [item.value, item.label])),
    warehouses: new Map(params.warehouses.map((item) => [item.value, item.label])),
    products: new Map(params.products.map((item) => [item.value, item.label])),
  };
}
