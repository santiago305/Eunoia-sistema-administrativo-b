export const AgencySearchFields = {
  NAME: "name",
  ALIAS: "alias",
  ADDRESS: "address",
  DEPARTMENT_ID: "departmentId",
  PROVINCE_ID: "provinceId",
  DISTRICT_ID: "districtId",
  IS_ACTIVE: "isActive",
} as const;

export type AgencySearchField = typeof AgencySearchFields[keyof typeof AgencySearchFields];

export const AgencySearchOperators = {
  IN: "in",
  CONTAINS: "contains",
  EQ: "eq",
} as const;

export type AgencySearchOperator = typeof AgencySearchOperators[keyof typeof AgencySearchOperators];

export const AgencySearchIsActiveValues = {
  ACTIVE: "true",
  INACTIVE: "false",
} as const;

export type AgencySearchIsActiveValue = typeof AgencySearchIsActiveValues[keyof typeof AgencySearchIsActiveValues];

export type AgencySearchRuleMode = "include" | "exclude";

export interface AgencySearchRule {
  field: AgencySearchField;
  operator: AgencySearchOperator;
  mode?: AgencySearchRuleMode;
  value?: string;
  values?: string[];
}

export interface AgencySearchSnapshot {
  q?: string;
  filters: AgencySearchRule[];
}

