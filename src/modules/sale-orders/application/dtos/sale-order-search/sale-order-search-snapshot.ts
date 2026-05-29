export const SaleOrderSearchFields = {
  NUMBER: "number",
  CLIENT_ID: "clientId",
  WAREHOUSE_ID: "warehouseId",
  AGENDA_STATUS: "agendaStatus",
  DELIVERY_STATUS: "deliveryStatus",
  DELIVERY_TYPE: "deliveryType",
  PAYMENT_STATUS: "paymentStatus",
  SCHEDULE_DATE: "scheduleDate",
  DELIVERY_DATE: "deliveryDate",
} as const;

export type SaleOrderSearchField = typeof SaleOrderSearchFields[keyof typeof SaleOrderSearchFields];

export const SaleOrderSearchOperators = {
  IN: "in",
  CONTAINS: "contains",
  EQ: "eq",
  ON: "on",
  BEFORE: "before",
  AFTER: "after",
  BETWEEN: "between",
  ON_OR_BEFORE: "onOrBefore",
  ON_OR_AFTER: "onOrAfter",
} as const;

export type SaleOrderSearchOperator = typeof SaleOrderSearchOperators[keyof typeof SaleOrderSearchOperators];

export type SaleOrderSearchRuleMode = "include" | "exclude";

export interface SaleOrderSearchRangeValue {
  start?: string;
  end?: string;
}

export const SaleOrderPaymentStatusValues = {
  PAID: "PAID",
  PENDING: "PENDING",
} as const;

export type SaleOrderPaymentStatusValue = typeof SaleOrderPaymentStatusValues[keyof typeof SaleOrderPaymentStatusValues];

export interface SaleOrderSearchRule {
  field: SaleOrderSearchField;
  operator: SaleOrderSearchOperator;
  mode?: SaleOrderSearchRuleMode;
  value?: string;
  values?: string[];
  range?: SaleOrderSearchRangeValue;
}

export interface SaleOrderSearchSnapshot {
  q?: string;
  filters: SaleOrderSearchRule[];
}

export type SaleOrderPaymentStatus = "PAID" | "PENDING";

export type SaleOrderPaymentOutput = {
  id: string;
  bankAccount: { id: string; name: string; number?: string | null } | null;
  date: string;
  method: string;
  operationNumber: string | null;
  amount: number;
  note: string | null;
  createdAt: string;
};

export type SaleOrderListItemOutput = {
  id: string;
  serie: string | null;
  correlative: number | null;
  warehouse: { id: string; name: string } | null;
  client: { id: string; fullName: string; docNumber?: string | null; reference?: string | null } | null;
  agencyDetail: string | null;
  source: { id: string; name: string; detail?: string | null } | null;
  scheduleDate: string | null;
  deliveryDate: string | null;
  deliveryType: string | null;
  subTotal: number;
  deliveryCost: number;
  total: number;
  note: string | null;
  createdBy: { id: string; name: string; email: string } | null;
  agendaStatus: string;
  deliveryStatus: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
  items: Array<{
    id: string;
    referencePackId: string | null;
    description: string | null;
    quantity: number;
    unitPrice: number;
    total: number;
    createdAt: string;
  }>;
  payments: SaleOrderPaymentOutput[];
  totalPaid: number;
  pendingAmount: number;
  paymentStatus: SaleOrderPaymentStatus;
};
