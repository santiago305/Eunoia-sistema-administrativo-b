export interface IncomeOutput {
  incomeId: string;
  saleOrderId: string;
  saleOrderNumber: string;
  clientName: string;
  amount: number;
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
}

export interface IncomeSummaryOutput {
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
  byMethod: Array<{ method: string; paymentMethodId: string | null; paymentMethodCode: string | null; amount: number; count: number }>;
  byAccount: Array<{ accountId: string | null; label: string; amount: number; count: number }>;
}

export interface IncomeListOutput {
  items: IncomeOutput[];
  total: number;
}
