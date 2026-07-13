import { PaymentSearchSnapshot } from "../payment-search-snapshot";

export interface PaymentSearchOptionOutput {
  id: string;
  label: string;
  keywords?: string[];
}

export interface PaymentSearchRecentOutput {
  recentId: string;
  label: string;
  snapshot: PaymentSearchSnapshot;
  lastUsedAt: Date;
}

export interface PaymentSearchMetricOutput {
  metricId: string;
  name: string;
  label: string;
  snapshot: PaymentSearchSnapshot;
  updatedAt: Date;
}

export interface PaymentSearchStateOutput {
  recent: PaymentSearchRecentOutput[];
  saved: PaymentSearchMetricOutput[];
  catalogs: {
    statuses: PaymentSearchOptionOutput[];
    currencies: PaymentSearchOptionOutput[];
    documentTypes: PaymentSearchOptionOutput[];
    evidenceStates: PaymentSearchOptionOutput[];
    paymentMethods: PaymentSearchOptionOutput[];
    companyPaymentAccounts: PaymentSearchOptionOutput[];
  };
}
