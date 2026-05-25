import { SourceSearchSnapshot } from "../source-search-snapshot";

export interface SaveSourceSearchMetricInput {
  userId: string;
  name: string;
  snapshot: SourceSearchSnapshot;
}

