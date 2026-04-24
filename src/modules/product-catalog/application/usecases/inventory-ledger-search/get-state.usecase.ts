import { Inject } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { WarehouseEntity } from "src/modules/warehouses/adapters/out/persistence/typeorm/entities/warehouse";
import { User as UserEntity } from "src/modules/users/adapters/out/persistence/typeorm/entities/user.entity";
import type { ProductCatalogProductType } from "src/modules/product-catalog/domain/value-objects/product-type";
import type { InventoryLedgerSearchStateOutput } from "../../dtos/inventory-ledger-search/output/inventory-ledger-search-state.output";
import type { InventoryLedgerSearchSnapshot } from "../../dtos/inventory-ledger-search/inventory-ledger-search-snapshot";
import {
  LISTING_SEARCH_STORAGE,
  ListingSearchStorageRepository,
} from "src/shared/listing-search/domain/listing-search.repository";
import {
  buildInventoryLedgerSearchLabel,
  INVENTORY_LEDGER_DIRECTION_OPTIONS,
  resolveInventoryLedgerTableKey,
  sanitizeInventoryLedgerSearchSnapshot,
} from "../../support/inventory-ledger-search.utils";

export class GetInventoryLedgerSearchStateUsecase {
  constructor(
    @Inject(LISTING_SEARCH_STORAGE)
    private readonly searchStorage: ListingSearchStorageRepository,
    @InjectRepository(WarehouseEntity)
    private readonly warehouseRepo: Repository<WarehouseEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
  ) {}

  async execute(params: { userId: string; productType?: ProductCatalogProductType }): Promise<InventoryLedgerSearchStateOutput> {
    const tableKey = resolveInventoryLedgerTableKey({ productType: params.productType });

    const [state, warehouses, userRows] = await Promise.all([
      this.searchStorage.listState({
        userId: params.userId,
        tableKey,
      }),
      this.warehouseRepo.find({
        where: { isActive: true },
        order: { name: "ASC" },
        select: ["id", "name"],
      }),
      this.userRepo.find({
        where: { deleted: false },
        order: { name: "ASC" },
        select: ["id", "name", "email"],
        take: 250,
      }),
    ]);

    const warehouseOptions = warehouses.map((row) => ({ id: row.id, label: row.name }));
    const users = (userRows ?? []).map((row) => ({ id: row.id, label: row.name || row.email }));
    const maps = {
      warehouses: new Map(warehouseOptions.map((item) => [item.id, item.label])),
      users: new Map(users.map((item) => [item.id, item.label])),
      directions: new Map(INVENTORY_LEDGER_DIRECTION_OPTIONS.map((item) => [item.id, item.label])),
    };

    return {
      recent: state.recent.map((item) => {
        const snapshot = sanitizeInventoryLedgerSearchSnapshot(item.snapshot as InventoryLedgerSearchSnapshot);
        return {
          recentId: item.recentId,
          label: buildInventoryLedgerSearchLabel(snapshot, maps),
          snapshot,
          lastUsedAt: item.lastUsedAt,
        };
      }),
      saved: state.metrics.map((item) => {
        const snapshot = sanitizeInventoryLedgerSearchSnapshot(item.snapshot as InventoryLedgerSearchSnapshot);
        return {
          metricId: item.metricId,
          name: item.name,
          label: buildInventoryLedgerSearchLabel(snapshot, maps),
          snapshot,
          updatedAt: item.updatedAt,
        };
      }),
      catalogs: {
        warehouses: warehouseOptions,
        users,
        directions: INVENTORY_LEDGER_DIRECTION_OPTIONS,
      },
    };
  }
}

