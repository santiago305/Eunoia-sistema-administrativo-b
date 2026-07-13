import { PaymentSearchSnapshot } from "../../application/dtos/payment-search/payment-search-snapshot";

export const PAYMENT_SEARCH = Symbol("PAYMENT_SEARCH");

export interface PaymentSearchRecentRecord {
  recentId: string;
  snapshot: PaymentSearchSnapshot;
  lastUsedAt: Date;
}

export interface PaymentSearchMetricRecord {
  metricId: string;
  name: string;
  snapshot: PaymentSearchSnapshot;
  updatedAt: Date;
}

export interface PaymentSearchPaymentMethodCatalogRecord {
  paymentMethodId: string;
  label: string;
}

export interface PaymentSearchCompanyAccountCatalogRecord {
  companyPaymentAccountId: string;
  label: string;
}

export interface PaymentSearchStateRecord {
  recent: PaymentSearchRecentRecord[];
  metrics: PaymentSearchMetricRecord[];
  paymentMethods: PaymentSearchPaymentMethodCatalogRecord[];
  companyPaymentAccounts: PaymentSearchCompanyAccountCatalogRecord[];
}

export interface PaymentSearchRepository {
  touchRecentSearch(params: {
    userId: string;
    tableKey: string;
    snapshot: PaymentSearchSnapshot;
  }): Promise<void>;
  listState(params: { userId: string; tableKey: string }): Promise<PaymentSearchStateRecord>;
  createMetric(params: {
    userId: string;
    tableKey: string;
    name: string;
    snapshot: PaymentSearchSnapshot;
  }): Promise<PaymentSearchMetricRecord>;
  deleteMetric(params: { userId: string; tableKey: string; metricId: string }): Promise<boolean>;
}
