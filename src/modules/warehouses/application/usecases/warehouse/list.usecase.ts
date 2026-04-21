import { Inject } from "@nestjs/common";
import { ListWarehousesInput } from "../../dtos/warehouse/input/list.input";
import { WarehouseOutput } from "../../dtos/warehouse/output/warehouse.out";
import { PaginatedResult } from "src/shared/utilidades/dto/paginateResult";
import {
  LISTING_SEARCH_STORAGE,
  ListingSearchStorageRepository,
} from "src/shared/listing-search/domain/listing-search.repository";
import { WAREHOUSE_REPOSITORY, WarehouseRepository } from "../../ports/warehouse.repository.port";
import { WarehouseOutputMapper } from "../../mappers/warehouse-output.mapper";
import {
  hasWarehouseSearchCriteria,
  sanitizeWarehouseSearchSnapshot,
} from "../../support/warehouse-search.utils";

const WAREHOUSE_SEARCH_TABLE_KEY = "warehouses";

export class ListWarehousesUsecase {
  constructor(
    @Inject(WAREHOUSE_REPOSITORY)
    private readonly warehouseRepo: WarehouseRepository,
    @Inject(LISTING_SEARCH_STORAGE)
    private readonly searchStorage: ListingSearchStorageRepository,
  ) {}

  async execute(input: ListWarehousesInput): Promise<PaginatedResult<WarehouseOutput>> {
    const page = input.page && input.page > 0 ? input.page : 1;
    const limit = input.limit && input.limit > 0 ? input.limit : 10;
    const snapshot = sanitizeWarehouseSearchSnapshot({
      q: input.q,
      filters: input.filters ?? [],
    });

    const { items, total } = await this.warehouseRepo.list({
      filters: snapshot.filters,
      q: input.q,
      page,
      limit,
    });

    if (input.requestedBy && hasWarehouseSearchCriteria(snapshot)) {
      await this.searchStorage.touchRecentSearch({
        userId: input.requestedBy,
        tableKey: WAREHOUSE_SEARCH_TABLE_KEY,
        snapshot,
      });
    }

    return {
      items: items.map((warehouse) => WarehouseOutputMapper.toWarehouseOutput(warehouse)),
      total,
      page,
      limit,
    };
  }
}
