import { createHash } from "crypto";
import { DocStatus } from "src/shared/domain/value-objects/doc-status";
import { DocType } from "src/shared/domain/value-objects/doc-type";
import type { ListingSearchOptionOutput } from "src/shared/listing-search/application/dtos/listing-search-state.output";
import type { ProductCatalogProductType } from "src/modules/product-catalog/domain/value-objects/product-type";
import type {
  InventoryDocumentsSearchField,
  InventoryDocumentsSearchRule,
  InventoryDocumentsSearchSnapshot,
} from "../dtos/inventory-documents-search/inventory-documents-search-snapshot";
import {
  INVENTORY_DOCUMENT_STATUS_VALUES,
  InventoryDocumentsSearchFields,
  InventoryDocumentsSearchOperators,
} from "../dtos/inventory-documents-search/inventory-documents-search-snapshot";

const uniqueStrings = (values: string[] | undefined) =>
  Array.from(new Set((values ?? []).map((value) => value?.trim()).filter(Boolean))) as string[];

const FILTER_FIELD_ORDER: InventoryDocumentsSearchField[] = [
  InventoryDocumentsSearchFields.WAREHOUSE_ID,
  InventoryDocumentsSearchFields.FROM_WAREHOUSE_ID,
  InventoryDocumentsSearchFields.TO_WAREHOUSE_ID,
  InventoryDocumentsSearchFields.CREATED_BY_ID,
  InventoryDocumentsSearchFields.STATUS,
];

const FIELD_LABELS: Record<InventoryDocumentsSearchField, string> = {
  [InventoryDocumentsSearchFields.WAREHOUSE_ID]: "Almacén",
  [InventoryDocumentsSearchFields.FROM_WAREHOUSE_ID]: "Origen",
  [InventoryDocumentsSearchFields.TO_WAREHOUSE_ID]: "Destino",
  [InventoryDocumentsSearchFields.CREATED_BY_ID]: "Usuario",
  [InventoryDocumentsSearchFields.STATUS]: "Estado",
};

export const INVENTORY_DOCUMENT_STATUS_OPTIONS: ListingSearchOptionOutput[] = [
  { id: DocStatus.DRAFT, label: "Borrador", keywords: ["draft", "borrador"] },
  { id: DocStatus.POSTED, label: "Contabilizado", keywords: ["posted", "contabilizado"] },
  { id: DocStatus.CANCELLED, label: "Anulado", keywords: ["cancelled", "anulado"] },
];

export function resolveInventoryDocumentsTableKey(params: {
  docType: DocType;
  productType?: ProductCatalogProductType | null;
}) {
  const docType = String(params.docType).toLowerCase();
  const productType = params.productType ? String(params.productType).toLowerCase() : "all";
  return `inventory-documents:${docType}:${productType}`;
}

function sanitizeSearchRule(rule?: Partial<InventoryDocumentsSearchRule> | null): InventoryDocumentsSearchRule | null {
  if (!rule?.field || !rule.operator) return null;
  if (!Object.values(InventoryDocumentsSearchFields).includes(rule.field)) return null;
  if (!Object.values(InventoryDocumentsSearchOperators).includes(rule.operator)) return null;
  if (rule.operator !== InventoryDocumentsSearchOperators.IN) return null;

  const values = uniqueStrings(rule.values);
  if (!values.length) return null;

  if (rule.field === InventoryDocumentsSearchFields.STATUS) {
    const allowed = new Set(INVENTORY_DOCUMENT_STATUS_VALUES);
    const normalized = values.filter((value) => allowed.has(value as DocStatus));
    if (!normalized.length) return null;
    return { field: rule.field, operator: rule.operator, values: normalized };
  }

  return { field: rule.field, operator: rule.operator, values };
}

export function sanitizeInventoryDocumentsSearchFilters(filters?: InventoryDocumentsSearchRule[] | null) {
  const source = Array.isArray(filters) ? filters : [];
  const mergedByField = new Map<InventoryDocumentsSearchField, InventoryDocumentsSearchRule>();

  source.forEach((rule) => {
    const normalized = sanitizeSearchRule(rule);
    if (!normalized) return;

    const existing = mergedByField.get(normalized.field);
    if (existing?.operator === InventoryDocumentsSearchOperators.IN) {
      mergedByField.set(normalized.field, {
        field: normalized.field,
        operator: normalized.operator,
        values: uniqueStrings([...(existing.values ?? []), ...(normalized.values ?? [])]),
      });
      return;
    }

    mergedByField.set(normalized.field, normalized);
  });

  return FILTER_FIELD_ORDER.map((field) => mergedByField.get(field)).filter(Boolean) as InventoryDocumentsSearchRule[];
}

export function sanitizeInventoryDocumentsSearchSnapshot(
  snapshot?: Partial<InventoryDocumentsSearchSnapshot> | null,
): InventoryDocumentsSearchSnapshot {
  const q = snapshot?.q?.trim();
  return {
    q: q || undefined,
    filters: sanitizeInventoryDocumentsSearchFilters(snapshot?.filters ?? []),
  };
}

export function hasInventoryDocumentsSearchCriteria(snapshot?: Partial<InventoryDocumentsSearchSnapshot> | null) {
  const normalized = sanitizeInventoryDocumentsSearchSnapshot(snapshot);
  return Boolean(normalized.q || normalized.filters.length);
}

export function getInventoryDocumentsRuleValues(snapshot: InventoryDocumentsSearchSnapshot, field: InventoryDocumentsSearchField) {
  const rule = sanitizeInventoryDocumentsSearchSnapshot(snapshot).filters.find((item) => item.field === field);
  return rule?.values ?? [];
}

export function buildInventoryDocumentsSearchLabel(
  snapshot: InventoryDocumentsSearchSnapshot,
  maps: { warehouses: Map<string, string>; users: Map<string, string>; statuses: Map<string, string> },
) {
  const parts: string[] = [];

  if (snapshot.q) parts.push(`Busqueda: ${snapshot.q}`);

  const warehouseIds = getInventoryDocumentsRuleValues(snapshot, InventoryDocumentsSearchFields.WAREHOUSE_ID);
  if (warehouseIds.length) {
    const labels = warehouseIds.map((id) => maps.warehouses.get(id) ?? id);
    parts.push(`${FIELD_LABELS[InventoryDocumentsSearchFields.WAREHOUSE_ID]}: ${labels.join(" - ")}`);
  }

  const fromWarehouseIds = getInventoryDocumentsRuleValues(snapshot, InventoryDocumentsSearchFields.FROM_WAREHOUSE_ID);
  if (fromWarehouseIds.length) {
    const labels = fromWarehouseIds.map((id) => maps.warehouses.get(id) ?? id);
    parts.push(`${FIELD_LABELS[InventoryDocumentsSearchFields.FROM_WAREHOUSE_ID]}: ${labels.join(" - ")}`);
  }

  const toWarehouseIds = getInventoryDocumentsRuleValues(snapshot, InventoryDocumentsSearchFields.TO_WAREHOUSE_ID);
  if (toWarehouseIds.length) {
    const labels = toWarehouseIds.map((id) => maps.warehouses.get(id) ?? id);
    parts.push(`${FIELD_LABELS[InventoryDocumentsSearchFields.TO_WAREHOUSE_ID]}: ${labels.join(" - ")}`);
  }

  const createdByIds = getInventoryDocumentsRuleValues(snapshot, InventoryDocumentsSearchFields.CREATED_BY_ID);
  if (createdByIds.length) {
    const labels = createdByIds.map((id) => maps.users.get(id) ?? id);
    parts.push(`${FIELD_LABELS[InventoryDocumentsSearchFields.CREATED_BY_ID]}: ${labels.join(" - ")}`);
  }

  const statuses = getInventoryDocumentsRuleValues(snapshot, InventoryDocumentsSearchFields.STATUS);
  if (statuses.length) {
    const labels = statuses.map((id) => maps.statuses.get(id) ?? id);
    parts.push(`${FIELD_LABELS[InventoryDocumentsSearchFields.STATUS]}: ${labels.join(" - ")}`);
  }

  return parts.join(" · ") || "Búsqueda";
}

export function createInventoryDocumentsSearchSnapshotHash(snapshot: InventoryDocumentsSearchSnapshot) {
  return createHash("sha256").update(JSON.stringify(snapshot)).digest("hex");
}
