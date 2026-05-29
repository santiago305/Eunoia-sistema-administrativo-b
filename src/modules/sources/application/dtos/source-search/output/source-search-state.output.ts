import {
  ListingSearchMetricOutput,
  ListingSearchOptionOutput,
  ListingSearchRecentOutput,
} from "src/shared/listing-search/application/dtos/listing-search-state.output";
import { SourceSearchSnapshot } from "../source-search-snapshot";

export interface SourceSearchStateOutput {
  recent: ListingSearchRecentOutput<SourceSearchSnapshot>[];
  saved: ListingSearchMetricOutput<SourceSearchSnapshot>[];
  catalogs: {
    activeStates: ListingSearchOptionOutput[];
  };
}

