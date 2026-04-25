import type {
  ListingSearchMetricOutput,
  ListingSearchOptionOutput,
  ListingSearchRecentOutput,
} from "src/shared/listing-search/application/dtos/listing-search-state.output";
import type { InventorySearchSnapshot } from "../inventory-search-snapshot";

export type InventorySearchStateOutput = {
  recent: ListingSearchRecentOutput<InventorySearchSnapshot>[];
  saved: ListingSearchMetricOutput<InventorySearchSnapshot>[];
  catalogs: {
    warehouses: ListingSearchOptionOutput[];
  };
};
