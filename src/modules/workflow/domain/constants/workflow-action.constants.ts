export const ACTIONS = {
  RESERVE_STOCK: "RESERVE_STOCK",
  CONSUME_STOCK: "CONSUME_STOCK",
  REVERT_STOCK: "REVERT_STOCK",
  MARK_INVOICE_SENT: "MARK_INVOICE_SENT",
} as const;

export type WorkflowActionType = typeof ACTIONS[keyof typeof ACTIONS];
