import { ListingSearchMetricOutput, ListingSearchOptionOutput, ListingSearchRecentOutput } from "src/shared/listing-search/application/dtos/listing-search-state.output";
import { SupplierSearchSnapshot } from "../supplier-search-snapshot";

export interface SupplierSearchStateOutput {
  recent: ListingSearchRecentOutput<SupplierSearchSnapshot>[];
  saved: ListingSearchMetricOutput<SupplierSearchSnapshot>[];
  catalogs: {
    documentTypes: ListingSearchOptionOutput[];
    activeStates: ListingSearchOptionOutput[];
  };
}
