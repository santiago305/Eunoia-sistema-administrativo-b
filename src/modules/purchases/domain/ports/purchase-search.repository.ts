import { PurchaseSearchSnapshot } from "../../application/dtos/purchase-search/purchase-search-snapshot";

export const PURCHASE_SEARCH = Symbol("PURCHASE_SEARCH");

export interface PurchaseSearchRecentRecord {
  recentId: string;
  snapshot: PurchaseSearchSnapshot;
  lastUsedAt: Date;
}

export interface PurchaseSearchMetricRecord {
  metricId: string;
  name: string;
  snapshot: PurchaseSearchSnapshot;
  updatedAt: Date;
}

export interface PurchaseSearchSupplierCatalogRecord {
  supplierId: string;
  label: string;
}

export interface PurchaseSearchWarehouseCatalogRecord {
  warehouseId: string;
  label: string;
}

export interface PurchaseSearchStateRecord {
  recent: PurchaseSearchRecentRecord[];
  metrics: PurchaseSearchMetricRecord[];
  suppliers: PurchaseSearchSupplierCatalogRecord[];
  warehouses: PurchaseSearchWarehouseCatalogRecord[];
}

export interface PurchaseSearchRepository {
  touchRecentSearch(params: {
    userId: string;
    tableKey: string;
    snapshot: PurchaseSearchSnapshot;
  }): Promise<void>;
  listState(params: { userId: string; tableKey: string }): Promise<PurchaseSearchStateRecord>;
  createMetric(params: {
    userId: string;
    tableKey: string;
    name: string;
    snapshot: PurchaseSearchSnapshot;
  }): Promise<PurchaseSearchMetricRecord>;
  deleteMetric(params: { userId: string; tableKey: string; metricId: string }): Promise<boolean>;
}
