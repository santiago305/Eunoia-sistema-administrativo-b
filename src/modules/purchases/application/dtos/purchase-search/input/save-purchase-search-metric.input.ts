import { PurchaseSearchSnapshot } from "../purchase-search-snapshot";

export interface SavePurchaseSearchMetricInput {
  userId: string;
  name: string;
  snapshot: PurchaseSearchSnapshot;
}
