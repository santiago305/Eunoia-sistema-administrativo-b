import { Inject } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { WarehouseEntity } from "src/modules/warehouses/adapters/out/persistence/typeorm/entities/warehouse";
import { User as UserEntity } from "src/modules/users/adapters/out/persistence/typeorm/entities/user.entity";
import { DocType } from "src/shared/domain/value-objects/doc-type";
import type { ProductCatalogProductType } from "src/modules/product-catalog/domain/value-objects/product-type";
import type { InventoryDocumentsSearchStateOutput } from "../../dtos/inventory-documents-search/output/inventory-documents-search-state.output";
import type { InventoryDocumentsSearchSnapshot } from "../../dtos/inventory-documents-search/inventory-documents-search-snapshot";
import {
  LISTING_SEARCH_STORAGE,
  ListingSearchStorageRepository,
} from "src/shared/listing-search/domain/listing-search.repository";
import {
  buildInventoryDocumentsSearchLabel,
  INVENTORY_DOCUMENT_STATUS_OPTIONS,
  resolveInventoryDocumentsTableKey,
  sanitizeInventoryDocumentsSearchSnapshot,
} from "../../support/inventory-documents-search.utils";

export class GetInventoryDocumentsSearchStateUsecase {
  constructor(
    @Inject(LISTING_SEARCH_STORAGE)
    private readonly searchStorage: ListingSearchStorageRepository,
    @InjectRepository(WarehouseEntity)
    private readonly warehouseRepo: Repository<WarehouseEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
  ) {}

  async execute(params: {
    userId: string;
    docType: DocType;
    productType?: ProductCatalogProductType;
  }): Promise<InventoryDocumentsSearchStateOutput> {
    const tableKey = resolveInventoryDocumentsTableKey({
      docType: params.docType,
      productType: params.productType,
    });

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
    const users = (userRows ?? []).map((row) => ({
      id: row.id,
      label: row.name || row.email,
    }));
    const maps = {
      warehouses: new Map(warehouseOptions.map((item) => [item.id, item.label])),
      users: new Map(users.map((item) => [item.id, item.label])),
      statuses: new Map(INVENTORY_DOCUMENT_STATUS_OPTIONS.map((item) => [item.id, item.label])),
    };

    return {
      recent: state.recent.map((item) => {
        const snapshot = sanitizeInventoryDocumentsSearchSnapshot(
          item.snapshot as InventoryDocumentsSearchSnapshot,
          params.docType,
        );
        return {
          recentId: item.recentId,
          label: buildInventoryDocumentsSearchLabel(snapshot, params.docType, maps),
          snapshot,
          lastUsedAt: item.lastUsedAt,
        };
      }),
      saved: state.metrics.map((item) => {
        const snapshot = sanitizeInventoryDocumentsSearchSnapshot(
          item.snapshot as InventoryDocumentsSearchSnapshot,
          params.docType,
        );
        return {
          metricId: item.metricId,
          name: item.name,
          label: buildInventoryDocumentsSearchLabel(snapshot, params.docType, maps),
          snapshot,
          updatedAt: item.updatedAt,
        };
      }),
      catalogs: {
        warehouses: warehouseOptions,
        users,
        statuses: INVENTORY_DOCUMENT_STATUS_OPTIONS,
      },
    };
  }
}
