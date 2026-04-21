import { Inject } from "@nestjs/common";
import { WarehouseSearchStateOutput } from "../../dtos/warehouse-search/output/warehouse-search-state.output";
import {
  LISTING_SEARCH_STORAGE,
  ListingSearchStorageRepository,
} from "src/shared/listing-search/domain/listing-search.repository";
import { WAREHOUSE_REPOSITORY, WarehouseRepository } from "../../ports/warehouse.repository.port";
import {
  buildWarehouseSearchLabel,
  sanitizeWarehouseSearchSnapshot,
  WAREHOUSE_ACTIVE_STATE_SEARCH_OPTIONS,
} from "../../support/warehouse-search.utils";
import { WarehouseSearchSnapshot } from "../../dtos/warehouse-search/warehouse-search-snapshot";

const WAREHOUSE_SEARCH_TABLE_KEY = "warehouses";

export class GetWarehouseSearchStateUsecase {
  constructor(
    @Inject(LISTING_SEARCH_STORAGE)
    private readonly searchStorage: ListingSearchStorageRepository,
    @Inject(WAREHOUSE_REPOSITORY)
    private readonly warehouseRepo: WarehouseRepository,
  ) {}

  async execute(userId: string): Promise<WarehouseSearchStateOutput> {
    const [state, catalogs] = await Promise.all([
      this.searchStorage.listState({
        userId,
        tableKey: WAREHOUSE_SEARCH_TABLE_KEY,
      }),
      this.warehouseRepo.listSearchCatalogs(),
    ]);

    const maps = {
      activeStates: new Map(WAREHOUSE_ACTIVE_STATE_SEARCH_OPTIONS.map((item) => [item.id, item.label])),
      departments: new Map(catalogs.departments.map((item) => [item.id, item.label])),
      provinces: new Map(catalogs.provinces.map((item) => [item.id, item.label])),
      districts: new Map(catalogs.districts.map((item) => [item.id, item.label])),
    };

    return {
      recent: state.recent.map((item) => {
        const snapshot = sanitizeWarehouseSearchSnapshot(item.snapshot as WarehouseSearchSnapshot);
        return {
          recentId: item.recentId,
          label: buildWarehouseSearchLabel(snapshot, maps),
          snapshot,
          lastUsedAt: item.lastUsedAt,
        };
      }),
      saved: state.metrics.map((item) => {
        const snapshot = sanitizeWarehouseSearchSnapshot(item.snapshot as WarehouseSearchSnapshot);
        return {
          metricId: item.metricId,
          name: item.name,
          label: buildWarehouseSearchLabel(snapshot, maps),
          snapshot,
          updatedAt: item.updatedAt,
        };
      }),
      catalogs: {
        activeStates: WAREHOUSE_ACTIVE_STATE_SEARCH_OPTIONS,
        departments: catalogs.departments,
        provinces: catalogs.provinces,
        districts: catalogs.districts,
      },
    };
  }
}
