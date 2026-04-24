import type {
  ListingSearchMetricOutput,
  ListingSearchOptionOutput,
  ListingSearchRecentOutput,
} from "src/shared/listing-search/application/dtos/listing-search-state.output";
import type { InventoryDocumentsSearchSnapshot } from "../inventory-documents-search-snapshot";

export interface InventoryDocumentsSearchStateOutput {
  recent: ListingSearchRecentOutput<InventoryDocumentsSearchSnapshot>[];
  saved: ListingSearchMetricOutput<InventoryDocumentsSearchSnapshot>[];
  catalogs: {
    warehouses: ListingSearchOptionOutput[];
    users: ListingSearchOptionOutput[];
    statuses: ListingSearchOptionOutput[];
  };
}
