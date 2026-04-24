import type {
  ProductCatalogProductSearchField,
  ProductCatalogProductSearchOperator,
  ProductCatalogProductSearchRule,
  ProductCatalogProductSearchRuleMode,
  ProductCatalogProductSearchSnapshot,
} from "../dtos/product-search/product-search-snapshot";
import {
  ProductCatalogProductSearchFields,
  ProductCatalogProductSearchOperators,
} from "../dtos/product-search/product-search-snapshot";
import type { ListingSearchOptionOutput } from "src/shared/listing-search/application/dtos/listing-search-state.output";
import { ProductCatalogProductType } from "src/modules/product-catalog/domain/value-objects/product-type";

export const PRODUCT_CATALOG_SEARCH_TABLE_KEYS = {
  [ProductCatalogProductType.PRODUCT]: "catalog-products",
  [ProductCatalogProductType.MATERIAL]: "catalog-materials",
} as const;

export function resolveProductCatalogSearchTableKey(type?: ProductCatalogProductType | string | null) {
  return type === ProductCatalogProductType.MATERIAL
    ? PRODUCT_CATALOG_SEARCH_TABLE_KEYS[ProductCatalogProductType.MATERIAL]
    : PRODUCT_CATALOG_SEARCH_TABLE_KEYS[ProductCatalogProductType.PRODUCT];
}

const uniqueStrings = (values: string[] | undefined) =>
  Array.from(new Set((values ?? []).map((value) => value?.trim()).filter(Boolean))) as string[];

const FILTER_FIELD_ORDER: ProductCatalogProductSearchField[] = [
  ProductCatalogProductSearchFields.NAME,
  ProductCatalogProductSearchFields.DESCRIPTION,
  ProductCatalogProductSearchFields.BRAND,
  ProductCatalogProductSearchFields.STATUS,
  ProductCatalogProductSearchFields.SKU_COUNT,
  ProductCatalogProductSearchFields.INVENTORY_TOTAL,
];

const FIELD_LABELS: Record<ProductCatalogProductSearchField, string> = {
  [ProductCatalogProductSearchFields.NAME]: "Nombre",
  [ProductCatalogProductSearchFields.DESCRIPTION]: "Descripción",
  [ProductCatalogProductSearchFields.BRAND]: "Marca",
  [ProductCatalogProductSearchFields.STATUS]: "Estado",
  [ProductCatalogProductSearchFields.SKU_COUNT]: "Variantes",
  [ProductCatalogProductSearchFields.INVENTORY_TOTAL]: "Stock",
};

const OPERATOR_LABELS: Partial<Record<ProductCatalogProductSearchOperator, string>> = {
  [ProductCatalogProductSearchOperators.CONTAINS]: "contiene",
  [ProductCatalogProductSearchOperators.EQ]: "=",
  [ProductCatalogProductSearchOperators.GT]: ">",
  [ProductCatalogProductSearchOperators.GTE]: ">=",
  [ProductCatalogProductSearchOperators.LT]: "<",
  [ProductCatalogProductSearchOperators.LTE]: "<=",
};

const TEXT_FIELDS = new Set<ProductCatalogProductSearchField>([
  ProductCatalogProductSearchFields.NAME,
  ProductCatalogProductSearchFields.DESCRIPTION,
  ProductCatalogProductSearchFields.BRAND,
]);

const NUMBER_FIELDS = new Set<ProductCatalogProductSearchField>([
  ProductCatalogProductSearchFields.SKU_COUNT,
  ProductCatalogProductSearchFields.INVENTORY_TOTAL,
]);

const TEXT_OPERATORS = new Set<ProductCatalogProductSearchOperator>([
  ProductCatalogProductSearchOperators.CONTAINS,
  ProductCatalogProductSearchOperators.EQ,
]);

const NUMBER_OPERATORS = new Set<ProductCatalogProductSearchOperator>([
  ProductCatalogProductSearchOperators.EQ,
  ProductCatalogProductSearchOperators.GT,
  ProductCatalogProductSearchOperators.GTE,
  ProductCatalogProductSearchOperators.LT,
  ProductCatalogProductSearchOperators.LTE,
]);

const STATUS_ALLOWED_VALUES = new Set<string>(["true", "false"]);

export const PRODUCT_STATUS_SEARCH_OPTIONS: ListingSearchOptionOutput[] = [
  { id: "true", label: "Activo", keywords: ["activo", "habilitado"] },
  { id: "false", label: "Desactivado", keywords: ["inactivo", "deshabilitado"] },
];

function normalizeRuleMode(mode?: ProductCatalogProductSearchRuleMode | null): ProductCatalogProductSearchRuleMode {
  return mode === "exclude" ? "exclude" : "include";
}

function sanitizeSearchRule(rule?: Partial<ProductCatalogProductSearchRule> | null): ProductCatalogProductSearchRule | null {
  if (!rule?.field || !rule.operator) return null;

  const field = rule.field;
  const operator = rule.operator;

  if (!Object.values(ProductCatalogProductSearchFields).includes(field)) return null;
  if (!Object.values(ProductCatalogProductSearchOperators).includes(operator)) return null;

  if (field === ProductCatalogProductSearchFields.STATUS) {
    if (operator !== ProductCatalogProductSearchOperators.IN) return null;
    const values = uniqueStrings(rule.values ?? (rule.value ? [rule.value] : undefined)).filter((value) =>
      STATUS_ALLOWED_VALUES.has(value),
    );
    if (!values.length) return null;
    return {
      field,
      operator,
      mode: normalizeRuleMode(rule.mode),
      values,
    };
  }

  if (TEXT_FIELDS.has(field)) {
    if (!TEXT_OPERATORS.has(operator)) return null;
    const value = rule.value?.trim();
    if (!value) return null;
    return { field, operator, value };
  }

  if (NUMBER_FIELDS.has(field)) {
    if (!NUMBER_OPERATORS.has(operator)) return null;
    const value = rule.value?.trim();
    if (!value || Number.isNaN(Number(value))) return null;
    return { field, operator, value };
  }

  return null;
}

export function sanitizeProductCatalogProductSearchFilters(
  filters?: ProductCatalogProductSearchRule[] | null,
): ProductCatalogProductSearchRule[] {
  const source = Array.isArray(filters) ? filters : [];
  const mergedByField = new Map<ProductCatalogProductSearchField, ProductCatalogProductSearchRule>();

  source.forEach((rule) => {
    const normalized = sanitizeSearchRule(rule);
    if (!normalized) return;

    const existing = mergedByField.get(normalized.field);
    if (
      normalized.field === ProductCatalogProductSearchFields.STATUS &&
      normalized.operator === ProductCatalogProductSearchOperators.IN &&
      existing?.operator === ProductCatalogProductSearchOperators.IN
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
    .filter(Boolean) as ProductCatalogProductSearchRule[];
}

export function sanitizeProductCatalogProductSearchSnapshot(
  snapshot?: Partial<ProductCatalogProductSearchSnapshot> | null,
): ProductCatalogProductSearchSnapshot {
  const q = snapshot?.q?.trim();
  return {
    q: q || undefined,
    filters: sanitizeProductCatalogProductSearchFilters(snapshot?.filters ?? []),
  };
}

export function hasProductCatalogProductSearchCriteria(snapshot?: Partial<ProductCatalogProductSearchSnapshot> | null) {
  const normalized = sanitizeProductCatalogProductSearchSnapshot(snapshot);
  return Boolean(normalized.q || normalized.filters.length);
}

export function buildProductCatalogProductSearchLabel(
  snapshot: ProductCatalogProductSearchSnapshot,
  maps?: { statuses?: Map<string, string> },
) {
  const parts: string[] = [];

  if (snapshot.q) {
    parts.push(`Busqueda: ${snapshot.q}`);
  }

  snapshot.filters.forEach((rule) => {
    const fieldLabel = FIELD_LABELS[rule.field];
    if (!fieldLabel) return;

    if (rule.operator === ProductCatalogProductSearchOperators.IN) {
      const labels = (rule.values ?? []).map((value) => maps?.statuses?.get(value) ?? value);
      const content = labels.join(" - ");
      const valueLabel = rule.mode === "exclude" ? `Excluye ${content}` : content;
      parts.push(`${fieldLabel}: ${valueLabel}`);
      return;
    }

    if (!rule.value) return;
    const operatorLabel = OPERATOR_LABELS[rule.operator] ?? rule.operator;
    parts.push(`${fieldLabel}: ${operatorLabel} ${rule.value}`);
  });

  return parts.join(" · ") || "Búsqueda";
}
