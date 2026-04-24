import type {
  ListingSearchMetricOutput,
  ListingSearchOptionOutput,
  ListingSearchRecentOutput,
} from "src/shared/listing-search/application/dtos/listing-search-state.output";
import type { ProductCatalogProductSearchSnapshot } from "../product-search-snapshot";

export interface ProductCatalogProductSearchStateOutput {
  recent: ListingSearchRecentOutput<ProductCatalogProductSearchSnapshot>[];
  saved: ListingSearchMetricOutput<ProductCatalogProductSearchSnapshot>[];
  catalogs: {
    statuses: ListingSearchOptionOutput[];
  };
}

