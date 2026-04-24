import { createHash } from "crypto";
import { Direction } from "src/shared/domain/value-objects/direction";
import type { ListingSearchOptionOutput } from "src/shared/listing-search/application/dtos/listing-search-state.output";
import type { ProductCatalogProductType } from "src/modules/product-catalog/domain/value-objects/product-type";
import type {
  InventoryLedgerSearchField,
  InventoryLedgerSearchRule,
  InventoryLedgerSearchSnapshot,
} from "../dtos/inventory-ledger-search/inventory-ledger-search-snapshot";
import {
  InventoryLedgerSearchFields,
  InventoryLedgerSearchOperators,
} from "../dtos/inventory-ledger-search/inventory-ledger-search-snapshot";

const uniqueStrings = (values: string[] | undefined) =>
  Array.from(new Set((values ?? []).map((value) => value?.trim()).filter(Boolean))) as string[];

const FILTER_FIELD_ORDER: InventoryLedgerSearchField[] = [
  InventoryLedgerSearchFields.SKU,
  InventoryLedgerSearchFields.WAREHOUSE_ID,
  InventoryLedgerSearchFields.USER_ID,
  InventoryLedgerSearchFields.DIRECTION,
];

const FIELD_LABELS: Record<InventoryLedgerSearchField, string> = {
  [InventoryLedgerSearchFields.SKU]: "Producto (SKU)",
  [InventoryLedgerSearchFields.WAREHOUSE_ID]: "Almacén",
  [InventoryLedgerSearchFields.USER_ID]: "Usuario",
  [InventoryLedgerSearchFields.DIRECTION]: "E/S",
};

export const INVENTORY_LEDGER_DIRECTION_OPTIONS: ListingSearchOptionOutput[] = [
  { id: Direction.IN, label: "Entrada", keywords: ["in", "entrada"] },
  { id: Direction.OUT, label: "Salida", keywords: ["out", "salida"] },
];

export function resolveInventoryLedgerTableKey(params: { productType?: ProductCatalogProductType | null }) {
  const productType = params.productType ? String(params.productType).toLowerCase() : "all";
  return `inventory-ledger:${productType}`;
}

function sanitizeSearchRule(rule?: Partial<InventoryLedgerSearchRule> | null): InventoryLedgerSearchRule | null {
  if (!rule?.field || !rule.operator) return null;
  if (!Object.values(InventoryLedgerSearchFields).includes(rule.field)) return null;
  if (!Object.values(InventoryLedgerSearchOperators).includes(rule.operator)) return null;

  if (rule.field === InventoryLedgerSearchFields.WAREHOUSE_ID || rule.field === InventoryLedgerSearchFields.USER_ID) {
    if (rule.operator !== InventoryLedgerSearchOperators.IN) return null;
    const values = uniqueStrings(rule.values);
    if (!values.length) return null;
    return { field: rule.field, operator: rule.operator, values } as InventoryLedgerSearchRule;
  }

  if (rule.field === InventoryLedgerSearchFields.DIRECTION) {
    if (rule.operator !== InventoryLedgerSearchOperators.IN) return null;
    const allowed = new Set(Object.values(Direction));
    const values = uniqueStrings(rule.values as unknown as string[]).filter((value) => allowed.has(value as Direction));
    if (!values.length) return null;
    return { field: rule.field, operator: rule.operator, values: values as Direction[] };
  }

  if (rule.field === InventoryLedgerSearchFields.SKU) {
    if (
      rule.operator !== InventoryLedgerSearchOperators.CONTAINS &&
      rule.operator !== InventoryLedgerSearchOperators.EQ
    ) {
      return null;
    }
    const value = String(rule.value ?? "").trim();
    if (!value) return null;
    return { field: rule.field, operator: rule.operator, value };
  }

  return null;
}

export function sanitizeInventoryLedgerSearchFilters(filters?: InventoryLedgerSearchRule[] | null) {
  const source = Array.isArray(filters) ? filters : [];
  const mergedByField = new Map<InventoryLedgerSearchField, InventoryLedgerSearchRule>();

  source.forEach((rule) => {
    const normalized = sanitizeSearchRule(rule);
    if (!normalized) return;

    const existing = mergedByField.get(normalized.field);
    if (normalized.operator === InventoryLedgerSearchOperators.IN && existing?.operator === InventoryLedgerSearchOperators.IN) {
      mergedByField.set(normalized.field, {
        field: normalized.field,
        operator: InventoryLedgerSearchOperators.IN,
        values: uniqueStrings([...(existing.values ?? []), ...(normalized.values ?? [])]) as any,
      } as InventoryLedgerSearchRule);
      return;
    }

    mergedByField.set(normalized.field, normalized);
  });

  return FILTER_FIELD_ORDER.map((field) => mergedByField.get(field)).filter(Boolean) as InventoryLedgerSearchRule[];
}

export function sanitizeInventoryLedgerSearchSnapshot(snapshot?: Partial<InventoryLedgerSearchSnapshot> | null): InventoryLedgerSearchSnapshot {
  const q = snapshot?.q?.trim();
  return {
    q: q || undefined,
    filters: sanitizeInventoryLedgerSearchFilters(snapshot?.filters ?? []),
  };
}

export function hasInventoryLedgerSearchCriteria(snapshot?: Partial<InventoryLedgerSearchSnapshot> | null) {
  const normalized = sanitizeInventoryLedgerSearchSnapshot(snapshot);
  return Boolean(normalized.q || normalized.filters.length);
}

export function getInventoryLedgerRule(snapshot: InventoryLedgerSearchSnapshot, field: InventoryLedgerSearchField) {
  return sanitizeInventoryLedgerSearchSnapshot(snapshot).filters.find((item) => item.field === field) ?? null;
}

export function buildInventoryLedgerSearchLabel(
  snapshot: InventoryLedgerSearchSnapshot,
  maps: { warehouses: Map<string, string>; users: Map<string, string>; directions: Map<string, string> },
) {
  const parts: string[] = [];

  if (snapshot.q) parts.push(`Busqueda: ${snapshot.q}`);

  const skuRule = getInventoryLedgerRule(snapshot, InventoryLedgerSearchFields.SKU);
  if (skuRule && skuRule.operator !== InventoryLedgerSearchOperators.IN) {
    parts.push(`${FIELD_LABELS[InventoryLedgerSearchFields.SKU]}: ${skuRule.value}`);
  }

  const warehouseRule = getInventoryLedgerRule(snapshot, InventoryLedgerSearchFields.WAREHOUSE_ID);
  if (warehouseRule?.operator === InventoryLedgerSearchOperators.IN && warehouseRule.values.length) {
    const labels = warehouseRule.values.map((id) => maps.warehouses.get(id) ?? id);
    parts.push(`${FIELD_LABELS[InventoryLedgerSearchFields.WAREHOUSE_ID]}: ${labels.join(" - ")}`);
  }

  const userRule = getInventoryLedgerRule(snapshot, InventoryLedgerSearchFields.USER_ID);
  if (userRule?.operator === InventoryLedgerSearchOperators.IN && userRule.values.length) {
    const labels = userRule.values.map((id) => maps.users.get(id) ?? id);
    parts.push(`${FIELD_LABELS[InventoryLedgerSearchFields.USER_ID]}: ${labels.join(" - ")}`);
  }

  const directionRule = getInventoryLedgerRule(snapshot, InventoryLedgerSearchFields.DIRECTION);
  if (directionRule?.operator === InventoryLedgerSearchOperators.IN && directionRule.values.length) {
    const labels = (directionRule.values as unknown as string[]).map((id) => maps.directions.get(id) ?? id);
    parts.push(`${FIELD_LABELS[InventoryLedgerSearchFields.DIRECTION]}: ${labels.join(" - ")}`);
  }

  return parts.join(" · ") || "Búsqueda";
}

export function createInventoryLedgerSearchSnapshotHash(snapshot: InventoryLedgerSearchSnapshot) {
  return createHash("sha256").update(JSON.stringify(snapshot)).digest("hex");
}
