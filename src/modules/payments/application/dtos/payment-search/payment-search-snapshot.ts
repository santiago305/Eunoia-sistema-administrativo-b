export const PaymentSearchFields = {
  STATUS: "status",
  CURRENCY: "currency",
  PAYMENT_METHOD_ID: "paymentMethodId",
  COMPANY_PAYMENT_ACCOUNT_ID: "companyPaymentAccountId",
  FROM_DOCUMENT_TYPE: "fromDocumentType",
  AMOUNT: "amount",
  DATE: "date",
  SCHEDULED_AT: "scheduledAt",
  PAID_AT: "paidAt",
  HAS_EVIDENCE: "hasEvidence",
  REQUESTED_BY_USER_ID: "requestedByUserId",
  APPROVED_BY_USER_ID: "approvedByUserId",
} as const;

export type PaymentSearchField =
  typeof PaymentSearchFields[keyof typeof PaymentSearchFields];

export const PaymentSearchOperators = {
  IN: "in",
  EQ: "eq",
  GT: "gt",
  GTE: "gte",
  LT: "lt",
  LTE: "lte",
  ON: "on",
  BEFORE: "before",
  AFTER: "after",
  BETWEEN: "between",
  ON_OR_BEFORE: "onOrBefore",
  ON_OR_AFTER: "onOrAfter",
} as const;

export type PaymentSearchOperator =
  typeof PaymentSearchOperators[keyof typeof PaymentSearchOperators];

export type PaymentSearchRuleMode = "include" | "exclude";

export interface PaymentSearchRangeValue {
  start?: string;
  end?: string;
}

export interface PaymentSearchRule {
  field: PaymentSearchField;
  operator: PaymentSearchOperator;
  mode?: PaymentSearchRuleMode;
  value?: string;
  values?: string[];
  range?: PaymentSearchRangeValue;
}

export interface PaymentSearchSnapshot {
  q?: string;
  filters: PaymentSearchRule[];
}
