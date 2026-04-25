import { Inject } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { WarehouseEntity } from "src/modules/warehouses/adapters/out/persistence/typeorm/entities/warehouse";
import {
  LISTING_SEARCH_STORAGE,
  ListingSearchStorageRepository,
} from "src/shared/listing-search/domain/listing-search.repository";
import type { ProductCatalogProductType } from "../../../domain/value-objects/product-type";
import type { InventorySearchStateOutput } from "../../dtos/inventory-search/output/inventory-search-state.output";
import type { InventorySearchSnapshot } from "../../dtos/inventory-search/inventory-search-snapshot";
import {
  buildInventorySearchLabel,
  buildInventoryWarehouseOptions,
  resolveInventoryTableKey,
  sanitizeInventorySearchSnapshot,
} from "../../support/inventory-search.utils";

export class GetInventorySearchStateUsecase {
  constructor(
    @Inject(LISTING_SEARCH_STORAGE)
    private readonly searchStorage: ListingSearchStorageRepository,
    @InjectRepository(WarehouseEntity)
    private readonly warehouseRepo: Repository<WarehouseEntity>,
  ) {}

  async execute(params: {
    userId: string;
    productType?: ProductCatalogProductType;
  }): Promise<InventorySearchStateOutput> {
    const tableKey = resolveInventoryTableKey({ productType: params.productType });

    const [state, warehouseRows] = await Promise.all([
      this.searchStorage.listState({
        userId: params.userId,
        tableKey,
      }),
      this.warehouseRepo.find({
        where: { isActive: true },
        order: { name: "ASC" },
        select: ["id", "name"],
      }),
    ]);

    const warehouses = buildInventoryWarehouseOptions(warehouseRows);
    const maps = {
      warehouses: new Map(warehouses.map((item) => [item.id, item.label])),
    };

    return {
      recent: state.recent.map((item) => {
        const snapshot = sanitizeInventorySearchSnapshot(item.snapshot as InventorySearchSnapshot);
        return {
          recentId: item.recentId,
          label: buildInventorySearchLabel(snapshot, maps, params.productType),
          snapshot,
          lastUsedAt: item.lastUsedAt,
        };
      }),
      saved: state.metrics.map((item) => {
        const snapshot = sanitizeInventorySearchSnapshot(item.snapshot as InventorySearchSnapshot);
        return {
          metricId: item.metricId,
          name: item.name,
          label: buildInventorySearchLabel(snapshot, maps, params.productType),
          snapshot,
          updatedAt: item.updatedAt,
        };
      }),
      catalogs: {
        warehouses,
      },
    };
  }
}
