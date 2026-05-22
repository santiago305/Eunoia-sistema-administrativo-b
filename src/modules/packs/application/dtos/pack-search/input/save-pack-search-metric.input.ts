import { PackSearchSnapshot } from "../pack-search-snapshot";

export interface SavePackSearchMetricInput {
  userId: string;
  name: string;
  snapshot: PackSearchSnapshot;
}

