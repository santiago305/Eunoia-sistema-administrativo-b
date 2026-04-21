import { SupplierSearchSnapshot } from "../supplier-search-snapshot";

export interface SaveSupplierSearchMetricInput {
  userId: string;
  name: string;
  snapshot: SupplierSearchSnapshot;
}
