import { ListingSearchMetricOutput, ListingSearchOptionOutput, ListingSearchRecentOutput } from "src/shared/listing-search/application/dtos/listing-search-state.output";
import { WarehouseSearchSnapshot } from "../warehouse-search-snapshot";

export interface WarehouseSearchStateOutput {
  recent: ListingSearchRecentOutput<WarehouseSearchSnapshot>[];
  saved: ListingSearchMetricOutput<WarehouseSearchSnapshot>[];
  catalogs: {
    activeStates: ListingSearchOptionOutput[];
    departments: ListingSearchOptionOutput[];
    provinces: ListingSearchOptionOutput[];
    districts: ListingSearchOptionOutput[];
  };
}
