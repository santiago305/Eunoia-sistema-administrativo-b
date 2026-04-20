import { createHash } from "crypto";
import { PaymentFormType } from "src/modules/purchases/domain/value-objects/payment-form-type";
import { PurchaseOrderStatus } from "src/modules/purchases/domain/value-objects/po-status";
import { VoucherDocType } from "src/modules/purchases/domain/value-objects/voucher-doc-type";
import {
  PurchaseSearchFilters,
  PurchaseSearchSnapshot,
} from "../dtos/purchase-search/purchase-search-snapshot";
import { PurchaseSearchOptionOutput } from "../dtos/purchase-search/output/purchase-search-state.output";

type SearchCatalogMaps = {
  suppliers?: Map<string, string>;
  warehouses?: Map<string, string>;
  statuses?: Map<string, string>;
  documentTypes?: Map<string, string>;
  paymentForms?: Map<string, string>;
};

const uniqueStrings = (values: string[] | undefined) =>
  Array.from(new Set((values ?? []).map((value) => value?.trim()).filter(Boolean))) as string[];

export const PURCHASE_STATUS_SEARCH_OPTIONS: PurchaseSearchOptionOutput[] = [
  { id: PurchaseOrderStatus.DRAFT, label: "Borrador", keywords: ["draft"] },
  { id: PurchaseOrderStatus.SENT, label: "Enviado", keywords: ["sent"] },
  { id: PurchaseOrderStatus.PARTIAL, label: "Parcial", keywords: ["partial", "pendiente ingreso"] },
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

export function normalizeSearchText(value: string | undefined | null) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function sanitizePurchaseSearchFilters(
  filters?: Partial<PurchaseSearchFilters> | null,
): PurchaseSearchFilters {
  return {
    supplierIds: uniqueStrings(filters?.supplierIds),
    warehouseIds: uniqueStrings(filters?.warehouseIds),
    statuses: uniqueStrings(filters?.statuses as string[] | undefined) as PurchaseOrderStatus[],
    documentTypes: uniqueStrings(filters?.documentTypes as string[] | undefined) as VoucherDocType[],
    paymentForms: uniqueStrings(filters?.paymentForms as string[] | undefined) as PaymentFormType[],
  };
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
      normalized.filters.supplierIds.length ||
      normalized.filters.warehouseIds.length ||
      normalized.filters.statuses.length ||
      normalized.filters.documentTypes.length ||
      normalized.filters.paymentForms.length,
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

export function buildPurchaseSearchLabel(
  snapshot: PurchaseSearchSnapshot,
  maps: SearchCatalogMaps,
) {
  const normalized = sanitizePurchaseSearchSnapshot(snapshot);
  const parts: string[] = [];

  if (normalized.q) {
    parts.push(`Busqueda: ${normalized.q}`);
  }

  if (normalized.filters.supplierIds.length) {
    parts.push(`Proveedor: ${mapIdsToLabels(normalized.filters.supplierIds, maps.suppliers).join(" - ")}`);
  }

  if (normalized.filters.warehouseIds.length) {
    parts.push(`Almacen: ${mapIdsToLabels(normalized.filters.warehouseIds, maps.warehouses).join(" - ")}`);
  }

  if (normalized.filters.statuses.length) {
    parts.push(`Estado: ${mapIdsToLabels(normalized.filters.statuses, maps.statuses).join(" - ")}`);
  }

  if (normalized.filters.documentTypes.length) {
    parts.push(`Tipo: ${mapIdsToLabels(normalized.filters.documentTypes, maps.documentTypes).join(" - ")}`);
  }

  if (normalized.filters.paymentForms.length) {
    parts.push(`Forma: ${mapIdsToLabels(normalized.filters.paymentForms, maps.paymentForms).join(" - ")}`);
  }

  return parts.join(" | ") || "Busqueda guardada";
}
