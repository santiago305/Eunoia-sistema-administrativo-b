import { RecurringPurchaseSearchSnapshot } from "../../application/dtos/recurring-purchase-search/recurring-purchase-search-snapshot";

export const RECURRING_PURCHASE_SEARCH = Symbol("RECURRING_PURCHASE_SEARCH");

export interface RecurringPurchaseSearchRecentRecord {
  recentId: string;
  snapshot: RecurringPurchaseSearchSnapshot;
  lastUsedAt: Date;
}

export interface RecurringPurchaseSearchMetricRecord {
  metricId: string;
  name: string;
  snapshot: RecurringPurchaseSearchSnapshot;
  updatedAt: Date;
}

export interface RecurringPurchaseSearchSupplierCatalogRecord {
  supplierId: string;
  label: string;
}

export interface RecurringPurchaseSearchStateRecord {
  recent: RecurringPurchaseSearchRecentRecord[];
  metrics: RecurringPurchaseSearchMetricRecord[];
  suppliers: RecurringPurchaseSearchSupplierCatalogRecord[];
}

export interface RecurringPurchaseSearchRepository {
  touchRecentSearch(params: {
    userId: string;
    tableKey: string;
    snapshot: RecurringPurchaseSearchSnapshot;
  }): Promise<void>;
  listState(params: { userId: string; tableKey: string }): Promise<RecurringPurchaseSearchStateRecord>;
  createMetric(params: {
    userId: string;
    tableKey: string;
    name: string;
    snapshot: RecurringPurchaseSearchSnapshot;
  }): Promise<RecurringPurchaseSearchMetricRecord>;
  deleteMetric(params: { userId: string; tableKey: string; metricId: string }): Promise<boolean>;
}
