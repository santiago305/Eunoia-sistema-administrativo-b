import type { ListingSearchOptionOutput } from "src/shared/listing-search/application/dtos/listing-search-state.output";
import type { InventoryLedgerSearchSnapshot } from "../inventory-ledger-search-snapshot";

export type InventoryLedgerRecentSearchOutput = {
  recentId: string;
  label: string;
  snapshot: InventoryLedgerSearchSnapshot;
  lastUsedAt: Date;
};

export type InventoryLedgerSavedMetricOutput = {
  metricId: string;
  name: string;
  label: string;
  snapshot: InventoryLedgerSearchSnapshot;
  updatedAt: Date;
};

export type InventoryLedgerSearchStateOutput = {
  recent: InventoryLedgerRecentSearchOutput[];
  saved: InventoryLedgerSavedMetricOutput[];
  catalogs: {
    warehouses: ListingSearchOptionOutput[];
    users: ListingSearchOptionOutput[];
    directions: ListingSearchOptionOutput[];
  };
};

