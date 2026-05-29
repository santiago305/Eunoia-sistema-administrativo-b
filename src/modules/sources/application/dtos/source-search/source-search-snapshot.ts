export const SourceSearchFields = {
  NAME: "name",
  DETAIL: "detail",
  IS_ACTIVE: "isActive",
} as const;

export type SourceSearchField = typeof SourceSearchFields[keyof typeof SourceSearchFields];

export const SourceSearchOperators = {
  IN: "in",
  CONTAINS: "contains",
  EQ: "eq",
} as const;

export type SourceSearchOperator = typeof SourceSearchOperators[keyof typeof SourceSearchOperators];

export const SourceSearchIsActiveValues = {
  ACTIVE: "true",
  INACTIVE: "false",
} as const;

export type SourceSearchIsActiveValue = typeof SourceSearchIsActiveValues[keyof typeof SourceSearchIsActiveValues];

export type SourceSearchRuleMode = "include" | "exclude";

export interface SourceSearchRule {
  field: SourceSearchField;
  operator: SourceSearchOperator;
  mode?: SourceSearchRuleMode;
  value?: string;
  values?: string[];
}

export interface SourceSearchSnapshot {
  q?: string;
  filters: SourceSearchRule[];
}

