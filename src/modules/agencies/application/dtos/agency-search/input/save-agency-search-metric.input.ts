import { AgencySearchSnapshot } from "../agency-search-snapshot";

export interface SaveAgencySearchMetricInput {
  userId: string;
  name: string;
  snapshot: AgencySearchSnapshot;
}

