import {
  ListingSearchMetricOutput,
  ListingSearchRecentOutput,
} from "src/shared/listing-search/application/dtos/listing-search-state.output";
import {
  ProductionFilterOptionsOutput,
  ProductionProductFilterOption,
  ProductionStatusFilterOption,
  ProductionWarehouseFilterOption,
} from "../../../ports/production-filter-options.repository";
import { ProductionSearchSnapshot } from "../production-search-snapshot";

export interface ProductionSearchStateOutput {
  recent: ListingSearchRecentOutput<ProductionSearchSnapshot>[];
  saved: ListingSearchMetricOutput<ProductionSearchSnapshot>[];
  catalogs: {
    statuses: ProductionStatusFilterOption[];
    warehouses: ProductionWarehouseFilterOption[];
    products: ProductionProductFilterOption[];
  };
}

export type ProductionSearchCatalogs = Omit<ProductionFilterOptionsOutput, never>;
