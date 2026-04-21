export const WarehouseSearchFields = {
  IS_ACTIVE: "isActive",
  NAME: "name",
  DEPARTMENT: "department",
  PROVINCE: "province",
  DISTRICT: "district",
  ADDRESS: "address",
} as const;

export type WarehouseSearchField =
  typeof WarehouseSearchFields[keyof typeof WarehouseSearchFields];

export const WarehouseSearchOperators = {
  IN: "in",
  CONTAINS: "contains",
  EQ: "eq",
} as const;

export type WarehouseSearchOperator =
  typeof WarehouseSearchOperators[keyof typeof WarehouseSearchOperators];

export const WarehouseSearchIsActiveValues = {
  ACTIVE: "true",
  INACTIVE: "false",
} as const;

export type WarehouseSearchIsActiveValue =
  typeof WarehouseSearchIsActiveValues[keyof typeof WarehouseSearchIsActiveValues];

export type WarehouseSearchRuleMode = "include" | "exclude";

export interface LegacyWarehouseSearchFilters {
  isActiveValues: WarehouseSearchIsActiveValue[];
  departments: string[];
  provinces: string[];
  districts: string[];
  name?: string;
  address?: string;
}

export interface WarehouseSearchRule {
  field: WarehouseSearchField;
  operator: WarehouseSearchOperator;
  mode?: WarehouseSearchRuleMode;
  value?: string;
  values?: string[];
}

export interface WarehouseSearchSnapshot {
  q?: string;
  filters: WarehouseSearchRule[];
}
