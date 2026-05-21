export const ClientSearchFields = {
  FULL_NAME: "fullName",
  DOC_NUMBER: "docNumber",
  ADDRESS: "address",
  REFERENCE: "reference",
  TYPE: "type",
  DOC_TYPE: "docType",
  DEPARTMENT_ID: "departmentId",
  PROVINCE_ID: "provinceId",
  DISTRICT_ID: "districtId",
  IS_ACTIVE: "isActive",
} as const;

export type ClientSearchField =
  typeof ClientSearchFields[keyof typeof ClientSearchFields];

export const ClientSearchOperators = {
  IN: "in",
  CONTAINS: "contains",
  EQ: "eq",
} as const;

export type ClientSearchOperator =
  typeof ClientSearchOperators[keyof typeof ClientSearchOperators];

export const ClientSearchIsActiveValues = {
  ACTIVE: "true",
  INACTIVE: "false",
} as const;

export type ClientSearchIsActiveValue =
  typeof ClientSearchIsActiveValues[keyof typeof ClientSearchIsActiveValues];

export type ClientSearchRuleMode = "include" | "exclude";

export interface ClientSearchRule {
  field: ClientSearchField;
  operator: ClientSearchOperator;
  mode?: ClientSearchRuleMode;
  value?: string;
  values?: string[];
}

export interface ClientSearchSnapshot {
  q?: string;
  filters: ClientSearchRule[];
}

