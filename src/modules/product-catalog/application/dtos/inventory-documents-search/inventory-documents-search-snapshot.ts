import { DocStatus } from "src/shared/domain/value-objects/doc-status";

export const InventoryDocumentsSearchFields = {
  WAREHOUSE_ID: "warehouseId",
  FROM_WAREHOUSE_ID: "fromWarehouseId",
  TO_WAREHOUSE_ID: "toWarehouseId",
  CREATED_BY_ID: "createdById",
  STATUS: "status",
} as const;

export type InventoryDocumentsSearchField =
  typeof InventoryDocumentsSearchFields[keyof typeof InventoryDocumentsSearchFields];

export const InventoryDocumentsSearchOperators = {
  IN: "IN",
} as const;

export type InventoryDocumentsSearchOperator =
  typeof InventoryDocumentsSearchOperators[keyof typeof InventoryDocumentsSearchOperators];

export interface InventoryDocumentsSearchRule {
  field: InventoryDocumentsSearchField;
  operator: InventoryDocumentsSearchOperator;
  values?: string[];
}

export interface InventoryDocumentsSearchSnapshot {
  q?: string;
  filters: InventoryDocumentsSearchRule[];
}

export const INVENTORY_DOCUMENT_STATUS_VALUES = Object.values(DocStatus);
