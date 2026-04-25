import { createHash } from "crypto";
import type { ListingSearchOptionOutput } from "src/shared/listing-search/application/dtos/listing-search-state.output";
import { ProductCatalogProductType } from "../../domain/value-objects/product-type";
import type {
  InventorySearchField,
  InventorySearchRule,
  InventorySearchSnapshot,
} from "../dtos/inventory-search/inventory-search-snapshot";
import {
  InventorySearchFields,
  InventorySearchOperators,
} from "../dtos/inventory-search/inventory-search-snapshot";

const uniqueStrings = (values: string[] | undefined) =>
  Array.from(new Set((values ?? []).map((value) => value?.trim()).filter(Boolean))) as string[];

const FILTER_FIELD_ORDER: InventorySearchField[] = [
  InventorySearchFields.SKU,
  InventorySearchFields.WAREHOUSE,
  InventorySearchFields.ON_HAND,
  InventorySearchFields.RESERVED,
  InventorySearchFields.AVAILABLE,
];

export function resolveInventoryTableKey(params: {
  productType?: ProductCatalogProductType | null;
}) {
  const productType = params.productType ? String(params.productType).toLowerCase() : "all";
  return `inventory:${productType}`;
}

function getItemFieldLabel(productType?: ProductCatalogProductType | null) {
  return productType === ProductCatalogProductType.MATERIAL ? "Material" : "Producto (SKU)";
}

function getFieldLabel(field: InventorySearchField, productType?: ProductCatalogProductType | null) {
  if (field === InventorySearchFields.SKU) return getItemFieldLabel(productType);
  if (field === InventorySearchFields.WAREHOUSE) return "Almacen";
  if (field === InventorySearchFields.ON_HAND) return "Stock";
  if (field === InventorySearchFields.RESERVED) return "Reservado";
  return "Disponible";
}

function sanitizeSearchRule(rule?: Partial<InventorySearchRule> | null): InventorySearchRule | null {
  if (!rule?.field || !rule.operator) return null;
  if (!Object.values(InventorySearchFields).includes(rule.field)) return null;
  if (!Object.values(InventorySearchOperators).includes(rule.operator)) return null;

  if (rule.field === InventorySearchFields.WAREHOUSE) {
    if (rule.operator !== InventorySearchOperators.IN) return null;
    const values = uniqueStrings(rule.values);
    if (!values.length) return null;

    return {
      field: rule.field,
      operator: rule.operator,
      mode: rule.mode === "exclude" ? "exclude" : "include",
      values,
    };
  }

  if (rule.field === InventorySearchFields.SKU) {
    if (
      rule.operator !== InventorySearchOperators.CONTAINS &&
      rule.operator !== InventorySearchOperators.EQ
    ) {
      return null;
    }

    const value = String(rule.value ?? "").trim();
    if (!value) return null;
    return {
      field: rule.field,
      operator: rule.operator,
      value,
    };
  }

  if (
    rule.field === InventorySearchFields.ON_HAND ||
    rule.field === InventorySearchFields.RESERVED ||
    rule.field === InventorySearchFields.AVAILABLE
  ) {
    const value = String(rule.value ?? "").trim();
    if (!value || Number.isNaN(Number(value))) return null;
    if (
      rule.operator !== InventorySearchOperators.EQ &&
      rule.operator !== InventorySearchOperators.GT &&
      rule.operator !== InventorySearchOperators.GTE &&
      rule.operator !== InventorySearchOperators.LT &&
      rule.operator !== InventorySearchOperators.LTE
    ) {
      return null;
    }

    return {
      field: rule.field,
      operator: rule.operator,
      value,
    };
  }

  return null;
}

export function sanitizeInventorySearchFilters(filters?: InventorySearchRule[] | null) {
  const source = Array.isArray(filters) ? filters : [];
  const mergedByField = new Map<InventorySearchField, InventorySearchRule>();

  source.forEach((rule) => {
    const normalized = sanitizeSearchRule(rule);
    if (!normalized) return;
    mergedByField.set(normalized.field, normalized);
  });

  return FILTER_FIELD_ORDER.map((field) => mergedByField.get(field)).filter(Boolean) as InventorySearchRule[];
}

export function sanitizeInventorySearchSnapshot(
  snapshot?: Partial<InventorySearchSnapshot> | null,
): InventorySearchSnapshot {
  const q = snapshot?.q?.trim();
  return {
    q: q || undefined,
    filters: sanitizeInventorySearchFilters(snapshot?.filters ?? []),
  };
}

export function hasInventorySearchCriteria(snapshot?: Partial<InventorySearchSnapshot> | null) {
  const normalized = sanitizeInventorySearchSnapshot(snapshot);
  return Boolean(normalized.q || normalized.filters.length);
}

export function getInventorySearchRule(
  snapshot: InventorySearchSnapshot,
  field: InventorySearchField,
) {
  return sanitizeInventorySearchSnapshot(snapshot).filters.find((item) => item.field === field) ?? null;
}

export function buildInventorySearchLabel(
  snapshot: InventorySearchSnapshot,
  maps: { warehouses: Map<string, string> },
  productType?: ProductCatalogProductType | null,
) {
  const parts: string[] = [];

  if (snapshot.q) parts.push(`Busqueda: ${snapshot.q}`);

  snapshot.filters.forEach((rule) => {
    if (rule.field === InventorySearchFields.WAREHOUSE && rule.operator === InventorySearchOperators.IN) {
      const labels = rule.values.map((id) => maps.warehouses.get(id) ?? id);
      const prefix = rule.mode === "exclude" ? "Excluye" : getFieldLabel(rule.field, productType);
      parts.push(`${prefix}: ${labels.join(" - ")}`);
      return;
    }

    if (rule.field === InventorySearchFields.SKU) {
      const operatorLabel = rule.operator === InventorySearchOperators.CONTAINS ? "contiene" : "=";
      parts.push(`${getFieldLabel(rule.field, productType)}: ${operatorLabel} ${rule.value}`);
      return;
    }

    parts.push(`${getFieldLabel(rule.field, productType)}: ${rule.operator} ${rule.value}`);
  });

  return parts.join(" · ") || "Busqueda";
}

export function createInventorySearchSnapshotHash(snapshot: InventorySearchSnapshot) {
  return createHash("sha256").update(JSON.stringify(snapshot)).digest("hex");
}

export function buildInventoryWarehouseOptions(
  warehouses: Array<{ id: string; name: string }>,
): ListingSearchOptionOutput[] {
  return warehouses.map((row) => ({ id: row.id, label: row.name }));
}
