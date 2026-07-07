export const SaleOrderSearchFields = {
  NUMBER: "number",
  CLIENT_ID: "clientId",
  WAREHOUSE_ID: "warehouseId",
  WORKFLOW_ID: "workflowId",
  SALE_ORDER_STATE_ID: "saleOrderStateId",
  BANK_ACCOUNT_ID: "bankAccountId",
  CLIENT_TYPE: "clientType",
  PAYMENT_STATUS: "paymentStatus",
  CLIENT_DEPARTMENT_ID: "clientDepartmentId",
  CLIENT_PROVINCE_ID: "clientProvinceId",
  CLIENT_DISTRICT_ID: "clientDistrictId",
  CLIENT_PHONE: "clientPhone",
  AGENCY_SUBSIDIARY_ID: "agencySubsidiaryId",
  SOURCE_ID: "sourceId",
  INVOICE_STATUS: "invoiceStatus",
  SCHEDULE_DATE: "scheduleDate",
  DELIVERY_DATE: "deliveryDate",
  CREATED_AT: "createdAt",
  ADVERTISING_CODE: "advertisingCode",
  OBSERVATION: "observation",
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
  IN_MONTH: "inMonth",
  IN_WEEK: "inWeek",
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

export const SaleOrderInvoiceStatusValues = {
  SENT: "SENT",
  PENDING: "PENDING",
} as const;

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

export type SaleOrderWorkflowOutput = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
};

export type SaleOrderWorkflowStateOutput = {
  id: string;
  code: string;
  name: string;
  color: string;
  isInitial: boolean;
  isFinal: boolean;
  isActive: boolean;
};

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
  client: {
    id: string;
    fullName: string;
    docNumber?: string | null;
    reference?: string | null;
    mainPhone: string | null;
    department: { id: string; name: string } | null;
    province: { id: string; name: string; departmentId: string } | null;
    district: { id: string; name: string; provinceId: string } | null;
  } | null;
  agencySubsidiaryId: string | null;
  source: { id: string; name: string; detail?: string | null } | null;
  scheduleDate: string | null;
  deliveryDate: string | null;
  subTotal: number;
  deliveryCost: number;
  total: number;
  note: string | null;
  advertisingCode: string | null;
  observation: string | null;
  createdBy: { id: string; name: string; email: string } | null;
  workflow: SaleOrderWorkflowOutput | null;
  currentState: SaleOrderWorkflowStateOutput | null;
  invoiceSend: boolean;
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
