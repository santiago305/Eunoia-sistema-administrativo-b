import { ClientSearchSnapshot } from "../client-search-snapshot";

export interface SaveClientSearchMetricInput {
  userId: string;
  name: string;
  snapshot: ClientSearchSnapshot;
}

