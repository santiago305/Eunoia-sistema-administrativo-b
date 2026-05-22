import {
  ListingSearchMetricOutput,
  ListingSearchOptionOutput,
  ListingSearchRecentOutput,
} from "src/shared/listing-search/application/dtos/listing-search-state.output";
import { PackSearchSnapshot } from "../pack-search-snapshot";

export interface PackSearchStateOutput {
  recent: ListingSearchRecentOutput<PackSearchSnapshot>[];
  saved: ListingSearchMetricOutput<PackSearchSnapshot>[];
  catalogs: {
    activeStates: ListingSearchOptionOutput[];
  };
}

