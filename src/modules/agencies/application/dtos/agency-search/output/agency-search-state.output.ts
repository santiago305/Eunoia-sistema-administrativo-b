import {
  ListingSearchMetricOutput,
  ListingSearchOptionOutput,
  ListingSearchRecentOutput,
} from "src/shared/listing-search/application/dtos/listing-search-state.output";
import { AgencySearchSnapshot } from "../agency-search-snapshot";

export interface AgencySearchStateOutput {
  recent: ListingSearchRecentOutput<AgencySearchSnapshot>[];
  saved: ListingSearchMetricOutput<AgencySearchSnapshot>[];
  catalogs: {
    activeStates: ListingSearchOptionOutput[];
    departments: ListingSearchOptionOutput[];
    provinces: ListingSearchOptionOutput[];
    districts: ListingSearchOptionOutput[];
  };
}

