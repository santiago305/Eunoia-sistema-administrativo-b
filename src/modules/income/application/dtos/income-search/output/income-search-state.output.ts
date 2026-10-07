import {
  ListingSearchMetricOutput,
  ListingSearchOptionOutput,
  ListingSearchRecentOutput,
} from "src/shared/listing-search/application/dtos/listing-search-state.output";
import { IncomeSearchSnapshot } from "../income-search-snapshot";

export interface IncomeSearchStateOutput {
  recent: ListingSearchRecentOutput<IncomeSearchSnapshot>[];
  saved: ListingSearchMetricOutput<IncomeSearchSnapshot>[];
  catalogs: {
    methods: ListingSearchOptionOutput[];
    accounts: ListingSearchOptionOutput[];
  };
}
