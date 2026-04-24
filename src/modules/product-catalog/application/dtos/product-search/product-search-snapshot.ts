export const ProductCatalogProductSearchFields = {
  NAME: "name",
  DESCRIPTION: "description",
  BRAND: "brand",
  STATUS: "status",
  SKU_COUNT: "skuCount",
  INVENTORY_TOTAL: "inventoryTotal",
} as const;

export type ProductCatalogProductSearchField =
  typeof ProductCatalogProductSearchFields[keyof typeof ProductCatalogProductSearchFields];

export const ProductCatalogProductSearchOperators = {
  CONTAINS: "CONTAINS",
  EQ: "EQ",
  GT: "GT",
  GTE: "GTE",
  LT: "LT",
  LTE: "LTE",
  IN: "IN",
} as const;

export type ProductCatalogProductSearchOperator =
  typeof ProductCatalogProductSearchOperators[keyof typeof ProductCatalogProductSearchOperators];

export type ProductCatalogProductSearchRuleMode = "include" | "exclude";

export interface ProductCatalogProductSearchRule {
  field: ProductCatalogProductSearchField;
  operator: ProductCatalogProductSearchOperator;
  mode?: ProductCatalogProductSearchRuleMode;
  value?: string;
  values?: string[];
}

export interface ProductCatalogProductSearchSnapshot {
  q?: string;
  filters: ProductCatalogProductSearchRule[];
}

