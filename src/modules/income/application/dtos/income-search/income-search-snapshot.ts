import type { ListingSearchSnapshot } from "src/shared/listing-search/domain/listing-search-snapshot";

export const IncomeSearchFields = {
  STATUS: "status",
  PAYMENT_METHOD_ID: "paymentMethodId",
  DETAIL: "detail",
  COMPANY_PAYMENT_ACCOUNT_ID: "companyPaymentAccountId",
  HAS_EVIDENCE: "hasEvidence",
} as const;

export type IncomeSearchField = typeof IncomeSearchFields[keyof typeof IncomeSearchFields];

export const IncomeSearchOperators = {
  IN: "in",
  CONTAINS: "contains",
  EQ: "eq",
} as const;

export type IncomeSearchOperator = typeof IncomeSearchOperators[keyof typeof IncomeSearchOperators];
export type IncomeSearchRuleMode = "include" | "exclude";

export interface IncomeSearchRule {
  field: IncomeSearchField;
  operator: IncomeSearchOperator;
  mode?: IncomeSearchRuleMode;
  value?: string;
  values?: string[];
}

export interface IncomeSearchSnapshot extends Omit<ListingSearchSnapshot, "filters"> {
  filters: IncomeSearchRule[];
}
