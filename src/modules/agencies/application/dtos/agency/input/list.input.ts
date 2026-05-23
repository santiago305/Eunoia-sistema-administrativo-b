import { AgencySearchRule } from "../../agency-search/agency-search-snapshot";

export interface ListAgenciesInput {
  q?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
  filters?: AgencySearchRule[];
  requestedBy?: string;
}

