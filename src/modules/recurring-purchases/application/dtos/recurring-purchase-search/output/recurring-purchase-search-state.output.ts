import { RecurringPurchaseSearchSnapshot } from "../recurring-purchase-search-snapshot";

export interface RecurringPurchaseSearchOptionOutput {
  id: string;
  label: string;
  keywords?: string[];
}

export interface RecurringPurchaseSearchRecentOutput {
  recentId: string;
  label: string;
  snapshot: RecurringPurchaseSearchSnapshot;
  lastUsedAt: Date;
}

export interface RecurringPurchaseSearchMetricOutput {
  metricId: string;
  name: string;
  label: string;
  snapshot: RecurringPurchaseSearchSnapshot;
  updatedAt: Date;
}

export interface RecurringPurchaseSearchStateOutput {
  recent: RecurringPurchaseSearchRecentOutput[];
  saved: RecurringPurchaseSearchMetricOutput[];
  catalogs: {
    suppliers: RecurringPurchaseSearchOptionOutput[];
    statuses: RecurringPurchaseSearchOptionOutput[];
    frequencies: RecurringPurchaseSearchOptionOutput[];
    purchaseTypes: RecurringPurchaseSearchOptionOutput[];
    currencies: RecurringPurchaseSearchOptionOutput[];
    paymentStatuses: RecurringPurchaseSearchOptionOutput[];
  };
}
