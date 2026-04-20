import { PurchaseSearchSnapshot } from "../purchase-search-snapshot";

export interface PurchaseSearchOptionOutput {
  id: string;
  label: string;
  keywords?: string[];
}

export interface PurchaseSearchRecentOutput {
  recentId: string;
  label: string;
  snapshot: PurchaseSearchSnapshot;
  lastUsedAt: Date;
}

export interface PurchaseSearchMetricOutput {
  metricId: string;
  name: string;
  label: string;
  snapshot: PurchaseSearchSnapshot;
  updatedAt: Date;
}

export interface PurchaseSearchStateOutput {
  recent: PurchaseSearchRecentOutput[];
  saved: PurchaseSearchMetricOutput[];
  catalogs: {
    suppliers: PurchaseSearchOptionOutput[];
    warehouses: PurchaseSearchOptionOutput[];
    statuses: PurchaseSearchOptionOutput[];
    documentTypes: PurchaseSearchOptionOutput[];
    paymentForms: PurchaseSearchOptionOutput[];
  };
}
