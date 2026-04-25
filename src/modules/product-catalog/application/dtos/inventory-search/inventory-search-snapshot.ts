export const InventorySearchFields = {
  SKU: "sku",
  WAREHOUSE: "warehouse",
  ON_HAND: "onHand",
  RESERVED: "reserved",
  AVAILABLE: "available",
} as const;

export type InventorySearchField =
  typeof InventorySearchFields[keyof typeof InventorySearchFields];

export const InventorySearchOperators = {
  IN: "IN",
  CONTAINS: "CONTAINS",
  EQ: "EQ",
  GT: "GT",
  GTE: "GTE",
  LT: "LT",
  LTE: "LTE",
} as const;

export type InventorySearchOperator =
  typeof InventorySearchOperators[keyof typeof InventorySearchOperators];

export type InventorySearchRule =
  | {
      field: typeof InventorySearchFields.WAREHOUSE;
      operator: typeof InventorySearchOperators.IN;
      mode?: "include" | "exclude";
      values: string[];
    }
  | {
      field: typeof InventorySearchFields.SKU;
      operator: typeof InventorySearchOperators.CONTAINS | typeof InventorySearchOperators.EQ;
      value: string;
    }
  | {
      field:
        | typeof InventorySearchFields.ON_HAND
        | typeof InventorySearchFields.RESERVED
        | typeof InventorySearchFields.AVAILABLE;
      operator:
        | typeof InventorySearchOperators.EQ
        | typeof InventorySearchOperators.GT
        | typeof InventorySearchOperators.GTE
        | typeof InventorySearchOperators.LT
        | typeof InventorySearchOperators.LTE;
      value: string;
    };

export type InventorySearchSnapshot = {
  q?: string;
  filters: InventorySearchRule[];
};
