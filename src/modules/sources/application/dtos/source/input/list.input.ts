import { SourceSearchRule } from "../../source-search/source-search-snapshot";

export interface ListSourcesInput {
  q?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
  filters?: SourceSearchRule[];
  requestedBy?: string;
}

