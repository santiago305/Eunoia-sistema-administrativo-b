import { LedgerEntryOutput } from "./ledger-out";

export interface PaginatedLedgerResult {
  items: LedgerEntryOutput[];
  total: number;
  page: number;
  limit: number;
}