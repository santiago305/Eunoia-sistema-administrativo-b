import { RecurringPurchaseSearchSnapshot } from "../recurring-purchase-search-snapshot";

export interface SaveRecurringPurchaseSearchMetricInput {
  userId: string;
  name: string;
  snapshot: Partial<RecurringPurchaseSearchSnapshot>;
}
