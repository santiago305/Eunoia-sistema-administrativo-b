import { PaymentFormType } from "src/modules/purchases/domain/value-objects/payment-form-type";
import { PurchaseOrderStatus } from "src/modules/purchases/domain/value-objects/po-status";
import { VoucherDocType } from "src/modules/purchases/domain/value-objects/voucher-doc-type";

export const PurchaseSearchFields = {
  SUPPLIER_ID: "supplierId",
  WAREHOUSE_ID: "warehouseId",
  STATUS: "status",
  DOCUMENT_TYPE: "documentType",
  PAYMENT_FORM: "paymentForm",
  NUMBER: "number",
  TOTAL: "total",
  TOTAL_PAID: "totalPaid",
  TOTAL_TO_PAY: "totalToPay",
  WAIT_TIME: "waitTime",
  DATE_ISSUE: "dateIssue",
  EXPECTED_AT: "expectedAt",
} as const;

export type PurchaseSearchField =
  typeof PurchaseSearchFields[keyof typeof PurchaseSearchFields];

export const PurchaseSearchOperators = {
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

export type PurchaseSearchOperator =
  typeof PurchaseSearchOperators[keyof typeof PurchaseSearchOperators];

export const PurchaseWaitTimeStates = {
  NOT_STARTED: "NOT_STARTED",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
} as const;

export type PurchaseWaitTimeState =
  typeof PurchaseWaitTimeStates[keyof typeof PurchaseWaitTimeStates];

export type PurchaseSearchRuleMode = "include" | "exclude";

export interface PurchaseSearchRangeValue {
  start?: string;
  end?: string;
}

export interface LegacyPurchaseSearchFilters {
  supplierIds: string[];
  warehouseIds: string[];
  statuses: PurchaseOrderStatus[];
  documentTypes: VoucherDocType[];
  paymentForms: PaymentFormType[];
}

export interface PurchaseSearchRule {
  field: PurchaseSearchField;
  operator: PurchaseSearchOperator;
  mode?: PurchaseSearchRuleMode;
  value?: string;
  values?: string[];
  range?: PurchaseSearchRangeValue;
}

export interface PurchaseSearchSnapshot {
  q?: string;
  filters: PurchaseSearchRule[];
}
