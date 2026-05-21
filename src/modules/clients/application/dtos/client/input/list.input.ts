import { ClientSearchRule } from "../../client-search/client-search-snapshot";

export interface ListClientsInput {
  q?: string;
  isActive?: boolean;
  filters?: ClientSearchRule[];
  requestedBy?: string;
  page?: number;
  limit?: number;
}
