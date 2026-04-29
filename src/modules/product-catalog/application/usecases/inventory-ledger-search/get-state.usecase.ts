import { Inject } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { WarehouseEntity } from "src/modules/warehouses/adapters/out/persistence/typeorm/entities/warehouse";
import { User as UserEntity } from "src/modules/users/adapters/out/persistence/typeorm/entities/user.entity";
import { ProductCatalogSkuEntity } from "src/modules/product-catalog/adapters/out/persistence/typeorm/entities/sku.entity";
import { ProductCatalogProductEntity } from "src/modules/product-catalog/adapters/out/persistence/typeorm/entities/product.entity";
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
    @InjectRepository(ProductCatalogSkuEntity)
    private readonly skuRepo: Repository<ProductCatalogSkuEntity>,
  ) {}

  async execute(params: { userId: string; productType?: ProductCatalogProductType }): Promise<InventoryLedgerSearchStateOutput> {
    const tableKey = resolveInventoryLedgerTableKey({ productType: params.productType });

    const [state, warehouses, userRows, skuRows] = await Promise.all([
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
      this.skuRepo
        .createQueryBuilder("s")
        .innerJoin(ProductCatalogProductEntity, "p", "p.product_id = s.product_id")
        .where(params.productType ? "p.type = :productType" : "1=1", params.productType ? { productType: params.productType } : {})
        .orderBy("s.name", "ASC")
        .select(["s.sku_id AS id", "s.name AS name", "s.backend_sku AS backendSku"])
        .take(500)
        .getRawMany<{ id: string; name: string | null; backendSku: string | null }>(),
    ]);

    const warehouseOptions = warehouses.map((row) => ({ id: row.id, label: row.name }));
    const users = (userRows ?? []).map((row) => ({ id: row.id, label: row.name || row.email }));
    const maps = {
      warehouses: new Map(warehouseOptions.map((item) => [item.id, item.label])),
      users: new Map(users.map((item) => [item.id, item.label])),
      directions: new Map(INVENTORY_LEDGER_DIRECTION_OPTIONS.map((item) => [item.id, item.label])),
      skus: new Map(
        (skuRows ?? []).map((item) => [item.id, item.name?.trim() || item.backendSku || item.id]),
      ),
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

