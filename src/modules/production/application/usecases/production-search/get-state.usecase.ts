import { Inject } from "@nestjs/common";
import {
  LISTING_SEARCH_STORAGE,
  ListingSearchStorageRepository,
} from "src/shared/listing-search/domain/listing-search.repository";
import {
  PRODUCTION_FILTER_OPTIONS_REPOSITORY,
  ProductionFilterOptionsRepository,
} from "../../ports/production-filter-options.repository";
import { ProductionSearchStateOutput } from "../../dto/production-search/output/production-search-state.output";
import { ProductionSearchSnapshot } from "../../dto/production-search/production-search-snapshot";
import {
  buildProductionSearchLabel,
  buildProductionSearchMaps,
  PRODUCTION_STATUS_OPTIONS,
  sanitizeProductionSearchSnapshot,
} from "../../support/production-search.utils";

const PRODUCTION_SEARCH_TABLE_KEY = "production-orders";

export class GetProductionOrderSearchStateUsecase {
  constructor(
    @Inject(LISTING_SEARCH_STORAGE)
    private readonly searchStorage: ListingSearchStorageRepository,
    @Inject(PRODUCTION_FILTER_OPTIONS_REPOSITORY)
    private readonly filterOptionsRepo: ProductionFilterOptionsRepository,
  ) {}

  async execute(userId: string): Promise<ProductionSearchStateOutput> {
    const [state, catalogs] = await Promise.all([
      this.searchStorage.listState({
        userId,
        tableKey: PRODUCTION_SEARCH_TABLE_KEY,
      }),
      this.filterOptionsRepo.getOptions(),
    ]);

    const maps = buildProductionSearchMaps({
      statuses: PRODUCTION_STATUS_OPTIONS,
      warehouses: catalogs.warehouses,
      products: catalogs.products,
    });

    return {
      recent: state.recent.map((item) => {
        const snapshot = sanitizeProductionSearchSnapshot(item.snapshot as ProductionSearchSnapshot);
        return {
          recentId: item.recentId,
          label: buildProductionSearchLabel(snapshot, maps),
          snapshot,
          lastUsedAt: item.lastUsedAt,
        };
      }),
      saved: state.metrics.map((item) => {
        const snapshot = sanitizeProductionSearchSnapshot(item.snapshot as ProductionSearchSnapshot);
        return {
          metricId: item.metricId,
          name: item.name,
          label: buildProductionSearchLabel(snapshot, maps),
          snapshot,
          updatedAt: item.updatedAt,
        };
      }),
      catalogs: {
        statuses: PRODUCTION_STATUS_OPTIONS,
        warehouses: catalogs.warehouses,
        products: catalogs.products,
      },
    };
  }
}
