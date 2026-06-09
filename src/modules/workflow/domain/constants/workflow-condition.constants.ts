export const CONDITIONS = {
  IS_PAID: "IS_PAID",
  HAS_STOCK: "HAS_STOCK",
  NOT_CANCELLED: "NOT_CANCELLED",
  DATE_AFTER: "DATE_AFTER",
  DATE_BEFORE: "DATE_BEFORE",
  INVOICE_SENT: "INVOICE_SENT",
} as const;

export type WorkflowConditionType = typeof CONDITIONS[keyof typeof CONDITIONS];
