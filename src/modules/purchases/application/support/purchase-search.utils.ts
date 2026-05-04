import { createHash } from "crypto";
import { PaymentFormType } from "src/modules/purchases/domain/value-objects/payment-form-type";
import { PurchaseOrderStatus } from "src/modules/purchases/domain/value-objects/po-status";
import { VoucherDocType } from "src/modules/purchases/domain/value-objects/voucher-doc-type";
import {
  LegacyPurchaseSearchFilters,
  PurchaseSearchField,
  PurchaseSearchFields,
  PurchaseSearchOperator,
  PurchaseSearchOperators,
  PurchaseSearchRule,
  PurchaseSearchRuleMode,
  PurchaseSearchSnapshot,
  PurchaseWaitTimeState,
  PurchaseWaitTimeStates,
} from "../dtos/purchase-search/purchase-search-snapshot";
import { PurchaseSearchOptionOutput } from "../dtos/purchase-search/output/purchase-search-state.output";

type SearchCatalogMaps = {
  suppliers?: Map<string, string>;
  warehouses?: Map<string, string>;
  statuses?: Map<string, string>;
  documentTypes?: Map<string, string>;
  paymentForms?: Map<string, string>;
  waitTimes?: Map<string, string>;
};

const uniqueStrings = (values: string[] | undefined) =>
  Array.from(new Set((values ?? []).map((value) => value?.trim()).filter(Boolean))) as string[];

const FILTER_FIELD_ORDER: PurchaseSearchField[] = [
  PurchaseSearchFields.DATE_ISSUE,
  PurchaseSearchFields.DOCUMENT_TYPE,
  PurchaseSearchFields.NUMBER,
  PurchaseSearchFields.SUPPLIER_ID,
  PurchaseSearchFields.WAREHOUSE_ID,
  PurchaseSearchFields.PAYMENT_FORM,
  PurchaseSearchFields.TOTAL,
  PurchaseSearchFields.TOTAL_PAID,
  PurchaseSearchFields.TOTAL_TO_PAY,
  PurchaseSearchFields.STATUS,
  PurchaseSearchFields.WAIT_TIME,
  PurchaseSearchFields.EXPECTED_AT,
];

const CATALOG_FIELDS = new Set<PurchaseSearchField>([
  PurchaseSearchFields.SUPPLIER_ID,
  PurchaseSearchFields.WAREHOUSE_ID,
  PurchaseSearchFields.STATUS,
  PurchaseSearchFields.DOCUMENT_TYPE,
  PurchaseSearchFields.PAYMENT_FORM,
  PurchaseSearchFields.WAIT_TIME,
]);

const TEXT_FIELDS = new Set<PurchaseSearchField>([
  PurchaseSearchFields.NUMBER,
]);

const NUMERIC_FIELDS = new Set<PurchaseSearchField>([
  PurchaseSearchFields.TOTAL,
  PurchaseSearchFields.TOTAL_PAID,
  PurchaseSearchFields.TOTAL_TO_PAY,
]);

const DATE_FIELDS = new Set<PurchaseSearchField>([
  PurchaseSearchFields.DATE_ISSUE,
  PurchaseSearchFields.EXPECTED_AT,
]);

const TEXT_OPERATORS = new Set<PurchaseSearchOperator>([
  PurchaseSearchOperators.CONTAINS,
  PurchaseSearchOperators.EQ,
]);

const NUMERIC_OPERATORS = new Set<PurchaseSearchOperator>([
  PurchaseSearchOperators.EQ,
  PurchaseSearchOperators.GT,
  PurchaseSearchOperators.GTE,
  PurchaseSearchOperators.LT,
  PurchaseSearchOperators.LTE,
]);

const DATE_OPERATORS = new Set<PurchaseSearchOperator>([
  PurchaseSearchOperators.ON,
  PurchaseSearchOperators.BEFORE,
  PurchaseSearchOperators.AFTER,
  PurchaseSearchOperators.BETWEEN,
  PurchaseSearchOperators.ON_OR_BEFORE,
  PurchaseSearchOperators.ON_OR_AFTER,
]);

const SEARCH_FIELD_LABELS: Record<PurchaseSearchField, string> = {
  [PurchaseSearchFields.SUPPLIER_ID]: "Proveedor",
  [PurchaseSearchFields.WAREHOUSE_ID]: "Almacen",
  [PurchaseSearchFields.STATUS]: "Estado",
  [PurchaseSearchFields.DOCUMENT_TYPE]: "Documento",
  [PurchaseSearchFields.PAYMENT_FORM]: "Forma",
  [PurchaseSearchFields.NUMBER]: "Numero",
  [PurchaseSearchFields.TOTAL]: "Total",
  [PurchaseSearchFields.TOTAL_PAID]: "Pagado",
  [PurchaseSearchFields.TOTAL_TO_PAY]: "Pendiente",
  [PurchaseSearchFields.WAIT_TIME]: "T. Espera",
  [PurchaseSearchFields.DATE_ISSUE]: "Emision",
  [PurchaseSearchFields.EXPECTED_AT]: "Ing. Almacen",
};

const SEARCH_OPERATOR_LABELS: Record<PurchaseSearchOperator, string> = {
  [PurchaseSearchOperators.IN]: ":",
  [PurchaseSearchOperators.CONTAINS]: "contiene",
  [PurchaseSearchOperators.EQ]: "=",
  [PurchaseSearchOperators.GT]: ">",
  [PurchaseSearchOperators.GTE]: ">=",
  [PurchaseSearchOperators.LT]: "<",
  [PurchaseSearchOperators.LTE]: "<=",
  [PurchaseSearchOperators.ON]: "=",
  [PurchaseSearchOperators.BEFORE]: "<",
  [PurchaseSearchOperators.AFTER]: ">",
  [PurchaseSearchOperators.BETWEEN]: "entre",
  [PurchaseSearchOperators.ON_OR_BEFORE]: "<=",
  [PurchaseSearchOperators.ON_OR_AFTER]: ">=",
};

export const PURCHASE_STATUS_SEARCH_OPTIONS: PurchaseSearchOptionOutput[] = [
  { id: PurchaseOrderStatus.DRAFT, label: "Borrador", keywords: ["draft"] },
  { id: PurchaseOrderStatus.SENT, label: "Enviado", keywords: ["sent"] },
  { id: PurchaseOrderStatus.PARTIAL, label: "Parcial", keywords: ["partial", "pendiente ingreso"] },
  {
    id: PurchaseOrderStatus.PENDING_RECEIPT_CONFIRMATION,
    label: "Pendiente confirmacion",
    keywords: ["confirmacion", "pendiente confirmacion", "evidencia"],
  },
  { id: PurchaseOrderStatus.RECEIVED, label: "Recibido", keywords: ["received", "terminado", "completado"] },
  { id: PurchaseOrderStatus.CANCELLED, label: "Cancelado", keywords: ["cancelled", "anulado"] },
];

export const PURCHASE_DOCUMENT_TYPE_SEARCH_OPTIONS: PurchaseSearchOptionOutput[] = [
  { id: VoucherDocType.FACTURA, label: "Factura", keywords: ["01"] },
  { id: VoucherDocType.BOLETA, label: "Boleta", keywords: ["03"] },
  { id: VoucherDocType.NOTA_VENTA, label: "Nota de venta", keywords: ["nota", "venta"] },
];

export const PURCHASE_PAYMENT_FORM_SEARCH_OPTIONS: PurchaseSearchOptionOutput[] = [
  { id: PaymentFormType.CONTADO, label: "Contado", keywords: ["efectivo", "pago inmediato"] },
  { id: PaymentFormType.CREDITO, label: "Credito", keywords: ["credito", "cuotas"] },
];

export const PURCHASE_WAIT_TIME_SEARCH_OPTIONS: PurchaseSearchOptionOutput[] = [
  { id: PurchaseWaitTimeStates.NOT_STARTED, label: "Todavia no comienza", keywords: ["pendiente", "inicio"] },
  { id: PurchaseWaitTimeStates.IN_PROGRESS, label: "En proceso", keywords: ["espera", "proceso", "ingreso"] },
  { id: PurchaseWaitTimeStates.COMPLETED, label: "Completado", keywords: ["recibido", "finalizado"] },
  { id: PurchaseWaitTimeStates.CANCELLED, label: "Cancelado", keywords: ["anulado"] },
];

export function normalizeSearchText(value: string | undefined | null) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function isLegacyFilters(value: unknown): value is Partial<LegacyPurchaseSearchFilters> {
  return Boolean(value) && !Array.isArray(value) && typeof value === "object";
}

function legacyFiltersToRules(filters?: Partial<LegacyPurchaseSearchFilters> | null): PurchaseSearchRule[] {
  if (!filters) return [];

  const rules: PurchaseSearchRule[] = [];

  const supplierIds = uniqueStrings(filters.supplierIds);
  if (supplierIds.length) {
    rules.push({
      field: PurchaseSearchFields.SUPPLIER_ID,
      operator: PurchaseSearchOperators.IN,
      values: supplierIds,
    });
  }

  const warehouseIds = uniqueStrings(filters.warehouseIds);
  if (warehouseIds.length) {
    rules.push({
      field: PurchaseSearchFields.WAREHOUSE_ID,
      operator: PurchaseSearchOperators.IN,
      values: warehouseIds,
    });
  }

  const statuses = uniqueStrings(filters.statuses as string[] | undefined);
  if (statuses.length) {
    rules.push({
      field: PurchaseSearchFields.STATUS,
      operator: PurchaseSearchOperators.IN,
      values: statuses,
    });
  }

  const documentTypes = uniqueStrings(filters.documentTypes as string[] | undefined);
  if (documentTypes.length) {
    rules.push({
      field: PurchaseSearchFields.DOCUMENT_TYPE,
      operator: PurchaseSearchOperators.IN,
      values: documentTypes,
    });
  }

  const paymentForms = uniqueStrings(filters.paymentForms as string[] | undefined);
  if (paymentForms.length) {
    rules.push({
      field: PurchaseSearchFields.PAYMENT_FORM,
      operator: PurchaseSearchOperators.IN,
      values: paymentForms,
    });
  }

  return rules;
}

function normalizeDateValue(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString().slice(0, 10);
}

function normalizeRuleMode(mode?: PurchaseSearchRuleMode | null): PurchaseSearchRuleMode {
  return mode === "exclude" ? "exclude" : "include";
}

function orderDateRange(start: string, end: string) {
  return start <= end ? { start, end } : { start: end, end: start };
}

function sanitizeSearchRule(rule?: Partial<PurchaseSearchRule> | null): PurchaseSearchRule | null {
  if (!rule?.field || !rule.operator) return null;

  const field = rule.field;
  const operator = rule.operator;

  if (!Object.values(PurchaseSearchFields).includes(field)) return null;
  if (!Object.values(PurchaseSearchOperators).includes(operator)) return null;

  if (CATALOG_FIELDS.has(field)) {
    if (operator !== PurchaseSearchOperators.IN) return null;
    const values = uniqueStrings(rule.values ?? (rule.value ? [rule.value] : undefined));
    if (!values.length) return null;
    const mode = normalizeRuleMode(rule.mode);

    if (field === PurchaseSearchFields.WAIT_TIME) {
      const allowed = new Set(Object.values(PurchaseWaitTimeStates));
      const normalized = values.filter((value) => allowed.has(value as PurchaseWaitTimeState));
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

  if (NUMERIC_FIELDS.has(field)) {
    if (!NUMERIC_OPERATORS.has(operator)) return null;
    const value = rule.value?.trim();
    if (!value || Number.isNaN(Number(value))) return null;
    return { field, operator, value };
  }

  if (DATE_FIELDS.has(field)) {
    if (!DATE_OPERATORS.has(operator)) return null;

    if (operator === PurchaseSearchOperators.BETWEEN) {
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

export function sanitizePurchaseSearchFilters(
  filters?: PurchaseSearchRule[] | Partial<LegacyPurchaseSearchFilters> | null,
): PurchaseSearchRule[] {
  const source = Array.isArray(filters)
    ? filters
    : isLegacyFilters(filters)
      ? legacyFiltersToRules(filters)
      : [];

  const mergedByField = new Map<PurchaseSearchField, PurchaseSearchRule>();

  source.forEach((rule) => {
    const normalized = sanitizeSearchRule(rule);
    if (!normalized) return;

    const existing = mergedByField.get(normalized.field);
    if (
      normalized.operator === PurchaseSearchOperators.IN &&
      existing?.operator === PurchaseSearchOperators.IN
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
    .filter(Boolean) as PurchaseSearchRule[];
}

export function sanitizePurchaseSearchSnapshot(
  snapshot?: Partial<PurchaseSearchSnapshot> | null,
): PurchaseSearchSnapshot {
  const q = snapshot?.q?.trim();
  return {
    q: q || undefined,
    filters: sanitizePurchaseSearchFilters(snapshot?.filters),
  };
}

export function hasPurchaseSearchCriteria(snapshot?: Partial<PurchaseSearchSnapshot> | null) {
  const normalized = sanitizePurchaseSearchSnapshot(snapshot);
  return Boolean(
    normalized.q ||
      normalized.filters.length,
  );
}

export function createPurchaseSearchSnapshotHash(snapshot: PurchaseSearchSnapshot) {
  const normalized = sanitizePurchaseSearchSnapshot(snapshot);
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

export function getPurchaseSearchRuleValues(
  snapshot: PurchaseSearchSnapshot,
  field: PurchaseSearchField,
) {
  const rule = sanitizePurchaseSearchSnapshot(snapshot).filters.find((item) => item.field === field);
  return rule?.values ?? [];
}

function getCatalogMap(field: PurchaseSearchField, maps: SearchCatalogMaps) {
  switch (field) {
    case PurchaseSearchFields.SUPPLIER_ID:
      return maps.suppliers;
    case PurchaseSearchFields.WAREHOUSE_ID:
      return maps.warehouses;
    case PurchaseSearchFields.STATUS:
      return maps.statuses;
    case PurchaseSearchFields.DOCUMENT_TYPE:
      return maps.documentTypes;
    case PurchaseSearchFields.PAYMENT_FORM:
      return maps.paymentForms;
    case PurchaseSearchFields.WAIT_TIME:
      return maps.waitTimes;
    default:
      return undefined;
  }
}

export function buildPurchaseSearchLabel(
  snapshot: PurchaseSearchSnapshot,
  maps: SearchCatalogMaps,
) {
  const normalized = sanitizePurchaseSearchSnapshot(snapshot);
  const parts: string[] = [];

  if (normalized.q) {
    parts.push(`Busqueda: ${normalized.q}`);
  }

  normalized.filters.forEach((rule) => {
    const label = SEARCH_FIELD_LABELS[rule.field];
    if (rule.operator === PurchaseSearchOperators.IN) {
      const values = mapIdsToLabels(rule.values ?? [], getCatalogMap(rule.field, maps));
      if (!values.length) return;
      parts.push(
        rule.mode === "exclude"
          ? `${label} excluye: ${values.join(" - ")}`
          : `${label}: ${values.join(" - ")}`,
      );
      return;
    }

    if (rule.operator === PurchaseSearchOperators.BETWEEN) {
      if (!rule.range?.start || !rule.range?.end) return;
      parts.push(`${label} entre ${rule.range.start} y ${rule.range.end}`);
      return;
    }

    if (!rule.value) return;
    parts.push(`${label} ${SEARCH_OPERATOR_LABELS[rule.operator]} ${rule.value}`);
  });

  return parts.join(" | ") || "Busqueda guardada";
}
