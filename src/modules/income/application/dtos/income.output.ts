export interface IncomeOutput {
  incomeId: string;
  saleOrderId: string;
  clientName: string;
  amount: number;
  method: string;
  companyPaymentAccountId: string | null;
  companyPaymentAccountLabel: string | null;
  operationNumber: string | null;
  date: string;
  createdAt: string;
  evidenceUrl: string | null;
}

export interface IncomeSummaryOutput {
  totalCollected: number;
  totalPending: number;
  ordersPaid: number;
  ordersPending: number;
  byMethod: Array<{ method: string; amount: number; count: number }>;
  byAccount: Array<{ accountId: string | null; label: string; amount: number; count: number }>;
}

export interface IncomeListOutput {
  items: IncomeOutput[];
  total: number;
}
