export const RecurringPurchaseSearchFields = {
  SUPPLIER_ID: "supplierId",
  STATUS: "status",
  FREQUENCY: "frequency",
  PURCHASE_TYPE: "purchaseType",
  CURRENCY: "currency",
  START_DATE: "startDate",
  NEXT_DUE_DATE: "nextDueDate",
  AMOUNT: "amount",
  PAYMENT_STATUS: "paymentStatus",
} as const;

export type RecurringPurchaseSearchField =
  typeof RecurringPurchaseSearchFields[keyof typeof RecurringPurchaseSearchFields];

export const RecurringPurchaseSearchOperators = {
  IN: "in",
  CONTAINS: "contains",
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

export type RecurringPurchaseSearchOperator =
  typeof RecurringPurchaseSearchOperators[keyof typeof RecurringPurchaseSearchOperators];

export type RecurringPurchaseSearchRuleMode = "include" | "exclude";

export interface RecurringPurchaseSearchRangeValue {
  start?: string;
  end?: string;
}

export interface RecurringPurchaseSearchRule {
  field: RecurringPurchaseSearchField;
  operator: RecurringPurchaseSearchOperator;
  mode?: RecurringPurchaseSearchRuleMode;
  value?: string;
  values?: string[];
  range?: RecurringPurchaseSearchRangeValue;
}

export interface RecurringPurchaseSearchSnapshot {
  q?: string;
  filters: RecurringPurchaseSearchRule[];
}
