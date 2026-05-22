import {
  ListingSearchMetricOutput,
  ListingSearchOptionOutput,
  ListingSearchRecentOutput,
} from "src/shared/listing-search/application/dtos/listing-search-state.output";
import { ClientSearchSnapshot } from "../client-search-snapshot";

export interface ClientSearchStateOutput {
  recent: ListingSearchRecentOutput<ClientSearchSnapshot>[];
  saved: ListingSearchMetricOutput<ClientSearchSnapshot>[];
  catalogs: {
    activeStates: ListingSearchOptionOutput[];
    docTypes: ListingSearchOptionOutput[];
    clientTypes: ListingSearchOptionOutput[];
    departments: ListingSearchOptionOutput[];
    provinces: ListingSearchOptionOutput[];
    districts: ListingSearchOptionOutput[];
  };
}

