import { SupplierDocType } from "src/modules/suppliers/domain/object-values/supplier-doc-type";

export const SupplierSearchFields = {
  DOCUMENT_TYPE: "documentType",
  IS_ACTIVE: "isActive",
  DOCUMENT_NUMBER: "documentNumber",
  NAME: "name",
  LAST_NAME: "lastName",
  TRADE_NAME: "tradeName",
  PHONE: "phone",
  EMAIL: "email",
} as const;

export type SupplierSearchField =
  typeof SupplierSearchFields[keyof typeof SupplierSearchFields];

export const SupplierSearchOperators = {
  IN: "in",
  CONTAINS: "contains",
  EQ: "eq",
} as const;

export type SupplierSearchOperator =
  typeof SupplierSearchOperators[keyof typeof SupplierSearchOperators];

export const SupplierSearchIsActiveValues = {
  ACTIVE: "true",
  INACTIVE: "false",
} as const;

export type SupplierSearchIsActiveValue =
  typeof SupplierSearchIsActiveValues[keyof typeof SupplierSearchIsActiveValues];

export type SupplierSearchRuleMode = "include" | "exclude";

export interface LegacySupplierSearchFilters {
  documentTypes: SupplierDocType[];
  isActiveValues: SupplierSearchIsActiveValue[];
  documentNumber?: string;
  name?: string;
  lastName?: string;
  tradeName?: string;
  phone?: string;
  email?: string;
}

export interface SupplierSearchRule {
  field: SupplierSearchField;
  operator: SupplierSearchOperator;
  mode?: SupplierSearchRuleMode;
  value?: string;
  values?: string[];
}

export interface SupplierSearchSnapshot {
  q?: string;
  filters: SupplierSearchRule[];
}
