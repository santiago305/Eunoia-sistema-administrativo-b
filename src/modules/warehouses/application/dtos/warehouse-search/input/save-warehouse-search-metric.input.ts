import { WarehouseSearchSnapshot } from "../warehouse-search-snapshot";

export interface SaveWarehouseSearchMetricInput {
  userId: string;
  name: string;
  snapshot: WarehouseSearchSnapshot;
}
