import { ProductionStatus } from "src/modules/production/domain/value-objects/production-status.vo";

export const ProductionSearchFields = {
  WAREHOUSE_ID: "warehouseId",
  FROM_WAREHOUSE_ID: "fromWarehouseId",
  TO_WAREHOUSE_ID: "toWarehouseId",
  STATUS: "status",
  SKU_ID: "skuId",
  CREATED_BY: "createdBy",
  NUMBER: "number",
  REFERENCE: "reference",
  MANUFACTURE_DATE: "manufactureDate",
  CREATED_AT: "createdAt",
} as const;

export type ProductionSearchField =
  typeof ProductionSearchFields[keyof typeof ProductionSearchFields];

export const ProductionSearchOperators = {
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

export type ProductionSearchOperator =
  typeof ProductionSearchOperators[keyof typeof ProductionSearchOperators];

export type ProductionSearchRuleMode = "include" | "exclude";

export interface ProductionSearchRangeValue {
  start?: string;
  end?: string;
}

export interface LegacyProductionSearchFilters {
  status?: ProductionStatus;
  warehouseId?: string;
  skuId?: string;
  from?: string;
  to?: string;
}

export interface ProductionSearchRule {
  field: ProductionSearchField;
  operator: ProductionSearchOperator;
  mode?: ProductionSearchRuleMode;
  value?: string;
  values?: string[];
  range?: ProductionSearchRangeValue;
}

export interface ProductionSearchSnapshot {
  q?: string;
  filters: ProductionSearchRule[];
}
