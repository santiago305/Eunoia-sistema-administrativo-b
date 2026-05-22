export const PackSearchFields = {
  IS_ACTIVE: "isActive",
  DESCRIPTION: "description",
  TOTAL: "total",
  SKU_TEXT: "skuText",
} as const;

export type PackSearchField = typeof PackSearchFields[keyof typeof PackSearchFields];

export const PackSearchOperators = {
  IN: "in",
  CONTAINS: "contains",
  EQ: "eq",
  GTE: "gte",
  LTE: "lte",
} as const;

export type PackSearchOperator = typeof PackSearchOperators[keyof typeof PackSearchOperators];

export const PackSearchIsActiveValues = {
  ACTIVE: "true",
  INACTIVE: "false",
} as const;

export type PackSearchIsActiveValue =
  typeof PackSearchIsActiveValues[keyof typeof PackSearchIsActiveValues];

export type PackSearchRuleMode = "include" | "exclude";

export interface PackSearchRule {
  field: PackSearchField;
  operator: PackSearchOperator;
  mode?: PackSearchRuleMode;
  value?: string;
  values?: string[];
}

export interface PackSearchSnapshot {
  q?: string;
  filters: PackSearchRule[];
}

