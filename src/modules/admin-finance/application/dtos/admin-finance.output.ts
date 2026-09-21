export type AdminFinanceFilters = {
  from?: string;
  to?: string;
  type?: "INCOME" | "EXPENSE";
  status?: string;
  q?: string;
};

export type AdminFinanceListFilters = AdminFinanceFilters & {
  page: number;
  limit: number;
};

export type AdminFinanceSummaryOutput = {
  income: {
    collected: number;
    pending: number;
    byCurrency: Record<string, { collected: number; pending: number }>;
  };
  expenses: {
    paid: number;
    pending: number;
    overdue: number;
    scheduled: number;
    byCurrency: Record<string, { paid: number; pending: number; overdue: number; scheduled: number; voided: number }>;
  };
  net: {
    collectedMinusPaid: number;
    projectedAfterPending: number;
    byCurrency: Record<string, { collectedMinusPaid: number; projectedAfterPending: number }>;
  };
};

export type AdminFinanceMovementOutput = {
  type: "INCOME" | "EXPENSE";
  source: "SALE_ORDER" | "PURCHASE" | "RECURRING_PURCHASE" | "LOGISTICS";
  sourceId: string;
  amount: number;
  currency: string;
  status: string;
  date: string;
  description: string;
};

export type AdminFinanceMovementListOutput = {
  items: AdminFinanceMovementOutput[];
  total: number;
};
