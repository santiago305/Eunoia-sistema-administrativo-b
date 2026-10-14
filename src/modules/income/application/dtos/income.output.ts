export interface IncomeOutput {
  incomeId: string;
  saleOrderId: string;
  saleOrderNumber: string;
  clientName: string;
  amount: number;
  currency: string;
  method: string;
  paymentMethodId: string | null;
  paymentMethodCode: string | null;
  paymentMethodName: string;
  companyPaymentAccountId: string | null;
  companyPaymentAccountLabel: string | null;
  operationNumber: string | null;
  detail: string | null;
  date: string;
  createdAt: string;
  evidenceUrl: string | null;
  evidence: IncomeEvidenceSummary;
  status: "PENDING_CONFIRMATION" | "POSTED" | "CANCELLED" | "REVERSED";
  correctedFromPaymentId: string | null;
  financialReason: string | null;
  postedAt: string | null;
  postedByUserId: string | null;
  appliedAmount: number;
  customerCreditBalance: number;
  reconciledAmount: number;
  reconciliationStatus: "UNRECONCILED" | "PARTIALLY_RECONCILED" | "RECONCILED";
  accountingDate: string | null;
  version: number;
  paymentDate: string;
  createdByUserId: string | null;
  updatedByUserId: string | null;
  voidedAt: string | null;
  voidedByUserId: string | null;
  voidReason: string | null;
}

export type IncomeEvidenceStatus =
  | "AVAILABLE"
  | "MISSING_OPTIONAL"
  | "MISSING_REQUIRED"
  | "UNAVAILABLE";

export interface IncomeEvidenceSummary {
  /** Indicates that an evidence object exists without exposing its private URL. */
  available: boolean;
  status: IncomeEvidenceStatus;
  attachmentId: string | null;
  url: string | null;
  originalName: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  createdAt: string | null;
  canView: boolean;
  canUpload: boolean;
  inherited?: boolean;
}

export interface IncomeSummaryOutput {
  totalCollected: number | null;
  totalPending: number | null;
  ordersPaid: number;
  ordersPending: number;
  postedPaymentsCount: number;
  averageCollectedPayment: number | null;
  collectionEffectiveness: number | null;
  observedPaymentsCount: number;
  observedPaymentsAmount: number | null;
  voidedPaymentsCount: number;
  voidedPaymentsAmount: number | null;
  currencyMetrics: Array<{
    currency: string;
    totalCollected: number;
    totalPending: number;
    ordersPaid: number;
    ordersPending: number;
    postedPaymentsCount: number;
    averageCollectedPayment: number;
    collectionEffectiveness: number;
    observedPaymentsCount: number;
    observedPaymentsAmount: number;
    voidedPaymentsCount: number;
    voidedPaymentsAmount: number;
  }>;
  customerCreditByCurrency: Array<{ currency: string; availableAmount: number; incomesCount: number }>;
  byMethod: Array<{ currency: string; method: string; paymentMethodId: string | null; paymentMethodCode: string | null; amount: number; count: number }>;
  byAccount: Array<{ currency: string; accountId: string | null; label: string; amount: number; count: number }>;
}

export interface IncomeListOutput {
  items: IncomeOutput[];
  total: number;
}
