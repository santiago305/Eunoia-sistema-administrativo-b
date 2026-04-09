import { InventorySnapshotOutput } from "./inventory-snapshot";

export interface PaginatedInventorySnapshotOutput {
  items: InventorySnapshotOutput[];
  total: number;
  page: number;
  limit: number;
}
