import { SaleOrderSearchSnapshot } from "src/modules/sale-orders/application/dtos/sale-order-search/sale-order-search-snapshot";

export const SALE_ORDER_SEARCH = Symbol("SALE_ORDER_SEARCH");

export interface SaleOrderSearchRecentRecord {
  recentId: string;
  snapshot: SaleOrderSearchSnapshot;
  lastUsedAt: Date;
}

export interface SaleOrderSearchMetricRecord {
  metricId: string;
  name: string;
  snapshot: SaleOrderSearchSnapshot;
  updatedAt: Date;
}

export interface SaleOrderSearchClientCatalogRecord {
  clientId: string;
  label: string;
}

export interface SaleOrderSearchWarehouseCatalogRecord {
  warehouseId: string;
  label: string;
}

export interface SaleOrderSearchStateRecord {
  recent: SaleOrderSearchRecentRecord[];
  metrics: SaleOrderSearchMetricRecord[];
  clients: SaleOrderSearchClientCatalogRecord[];
  warehouses: SaleOrderSearchWarehouseCatalogRecord[];
  workflows: Array<{ workflowId: string; label: string }>;
  states: Array<{ saleOrderStateId: string; label: string }>;
}

export interface SaleOrderSearchRepository {
  touchRecentSearch(params: {
    userId: string;
    tableKey: string;
    snapshot: SaleOrderSearchSnapshot;
  }): Promise<void>;
  listState(params: { userId: string; tableKey: string }): Promise<SaleOrderSearchStateRecord>;
  createMetric(params: {
    userId: string;
    tableKey: string;
    name: string;
    snapshot: SaleOrderSearchSnapshot;
  }): Promise<SaleOrderSearchMetricRecord>;
  deleteMetric(params: { userId: string; tableKey: string; metricId: string }): Promise<boolean>;
}

