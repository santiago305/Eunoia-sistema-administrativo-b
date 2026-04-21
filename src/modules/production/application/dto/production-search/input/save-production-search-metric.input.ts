import { ProductionSearchSnapshot } from "../production-search-snapshot";

export interface SaveProductionSearchMetricInput {
  userId: string;
  name: string;
  snapshot: ProductionSearchSnapshot;
}
