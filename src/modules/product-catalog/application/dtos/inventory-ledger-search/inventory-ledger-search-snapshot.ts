import { Direction } from "src/shared/domain/value-objects/direction";

export const InventoryLedgerSearchFields = {
  SKU: "sku",
  WAREHOUSE_ID: "warehouseId",
  USER_ID: "userId",
  DIRECTION: "direction",
} as const;

export type InventoryLedgerSearchField =
  typeof InventoryLedgerSearchFields[keyof typeof InventoryLedgerSearchFields];

export const InventoryLedgerSearchOperators = {
  IN: "IN",
  CONTAINS: "CONTAINS",
  EQ: "EQ",
} as const;

export type InventoryLedgerSearchOperator =
  typeof InventoryLedgerSearchOperators[keyof typeof InventoryLedgerSearchOperators];

export type InventoryLedgerSearchRule =
  | {
      field: typeof InventoryLedgerSearchFields.WAREHOUSE_ID;
      operator: typeof InventoryLedgerSearchOperators.IN;
      values: string[];
    }
  | {
      field: typeof InventoryLedgerSearchFields.USER_ID;
      operator: typeof InventoryLedgerSearchOperators.IN;
      values: string[];
    }
  | {
      field: typeof InventoryLedgerSearchFields.DIRECTION;
      operator: typeof InventoryLedgerSearchOperators.IN;
      values: Direction[];
    }
  | {
      field: typeof InventoryLedgerSearchFields.SKU;
      operator: typeof InventoryLedgerSearchOperators.CONTAINS | typeof InventoryLedgerSearchOperators.EQ;
      value: string;
    };

export type InventoryLedgerSearchSnapshot = {
  q?: string;
  filters: InventoryLedgerSearchRule[];
};

