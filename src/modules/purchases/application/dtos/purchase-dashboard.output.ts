export type PurchaseDashboardSummaryOutput = {
  totalPurchased: number;
  totalPaid: number;
  pending: number;
  overdue: number;
  drafts: number;
  toApprove: number;
  paymentsToApprove: number;
  received: number;
};

export type PurchaseDashboardSeriesPointOutput = {
  label: string;
  value: number;
  count?: number;
};

export type PurchaseDashboardMonthlyPointOutput = {
  month: string;
  purchased: number;
  paid: number;
};

export type PurchaseDashboardPaymentRowOutput = {
  accountPayableId: string;
  purchaseId: string;
  supplierId: string | null;
  supplierName: string | null;
  dueDate: string | null;
  amountPending: number;
  currency: string;
  status: string;
};

export type PurchaseDashboardTopItemOutput = {
  itemId: string | null;
  label: string;
  itemType: string;
  total: number;
  quantity: number;
};

export type PurchaseDashboardTopSupplierOutput = {
  supplierId: string | null;
  supplierName: string;
  total: number;
  count: number;
};
