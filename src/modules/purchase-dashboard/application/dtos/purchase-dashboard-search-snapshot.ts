export const PurchaseDashboardSearchFields = {
  PURCHASE_TYPE: "purchaseType",
  PAYMENT_STATUS: "paymentStatus",
  SUPPLIER_ID: "supplierId",
  USER_ID: "userId",
  WAREHOUSE_ID: "warehouseId",
  PAYMENT_METHOD_ID: "paymentMethodId",
  COMPANY_PAYMENT_ACCOUNT_ID: "companyPaymentAccountId",
} as const;

export type PurchaseDashboardSearchField =
  typeof PurchaseDashboardSearchFields[keyof typeof PurchaseDashboardSearchFields];

export const PurchaseDashboardSearchOperators = {
  IN: "in",
} as const;

export type PurchaseDashboardSearchOperator =
  typeof PurchaseDashboardSearchOperators[keyof typeof PurchaseDashboardSearchOperators];

export interface PurchaseDashboardSearchRule {
  field: PurchaseDashboardSearchField;
  operator: PurchaseDashboardSearchOperator;
  values: string[];
}

export interface PurchaseDashboardDateRangeSnapshot {
  mode: "absolute";
  from?: string;
  to?: string;
}

export interface PurchaseDashboardSearchSnapshot {
  filters: PurchaseDashboardSearchRule[];
  dateRange?: PurchaseDashboardDateRangeSnapshot;
}

export interface SavePurchaseDashboardSearchMetricInput {
  userId: string;
  name: string;
  snapshot?: Partial<PurchaseDashboardSearchSnapshot> | null;
}
