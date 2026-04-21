import { Inject, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PurchaseSearchRepository, PurchaseSearchStateRecord } from "src/modules/purchases/domain/ports/purchase-search.repository";
import { PurchaseSearchSnapshot } from "src/modules/purchases/application/dtos/purchase-search/purchase-search-snapshot";
import { SupplierEntity } from "src/modules/suppliers/adapters/out/persistence/typeorm/entities/supplier.entity";
import { WarehouseEntity } from "src/modules/warehouses/adapters/out/persistence/typeorm/entities/warehouse";
import {
  LISTING_SEARCH_STORAGE,
  ListingSearchStorageRepository,
} from "src/shared/listing-search/domain/listing-search.repository";

@Injectable()
export class PurchaseSearchTypeormRepository implements PurchaseSearchRepository {
  constructor(
    @Inject(LISTING_SEARCH_STORAGE)
    private readonly storage: ListingSearchStorageRepository,
    @InjectRepository(SupplierEntity)
    private readonly supplierRepo: Repository<SupplierEntity>,
    @InjectRepository(WarehouseEntity)
    private readonly warehouseRepo: Repository<WarehouseEntity>,
  ) {}

  async touchRecentSearch(params: Parameters<PurchaseSearchRepository["touchRecentSearch"]>[0]): Promise<void> {
    await this.storage.touchRecentSearch(params);
  }

  async listState(params: { userId: string; tableKey: string }): Promise<PurchaseSearchStateRecord> {
    const [state, suppliers, warehouses] = await Promise.all([
      this.storage.listState(params),
      this.supplierRepo.find({
        where: { isActive: true },
      }),
      this.warehouseRepo.find({
        where: { isActive: true },
      }),
    ]);

    const orderedSuppliers = [...suppliers].sort((left, right) => {
      const leftLabel = [left.name, left.lastName].filter(Boolean).join(" ").trim() || left.tradeName || left.id;
      const rightLabel = [right.name, right.lastName].filter(Boolean).join(" ").trim() || right.tradeName || right.id;
      return leftLabel.localeCompare(rightLabel, "es", { sensitivity: "base" });
    });

    const orderedWarehouses = [...warehouses].sort((left, right) =>
      left.name.localeCompare(right.name, "es", { sensitivity: "base" }),
    );

    return {
      recent: state.recent.map((item) => ({
        recentId: item.recentId,
        snapshot: item.snapshot as PurchaseSearchSnapshot,
        lastUsedAt: item.lastUsedAt,
      })),
      metrics: state.metrics.map((item) => ({
        metricId: item.metricId,
        name: item.name,
        snapshot: item.snapshot as PurchaseSearchSnapshot,
        updatedAt: item.updatedAt,
      })),
      suppliers: orderedSuppliers.map((row) => {
        const fullName = [row.name, row.lastName].filter(Boolean).join(" ").trim();
        const display = (fullName || row.tradeName || "").trim() || row.id;
        const doc = row.documentNumber ? ` (${row.documentNumber})` : "";
        return {
          supplierId: row.id,
          label: `${display}${doc}`.trim(),
        };
      }),
      warehouses: orderedWarehouses.map((row) => ({
        warehouseId: row.id,
        label: row.name,
      })),
    };
  }

  async createMetric(params: {
    userId: string;
    tableKey: string;
    name: string;
    snapshot: Parameters<PurchaseSearchRepository["createMetric"]>[0]["snapshot"];
  }) {
    const metric = await this.storage.createMetric(params);
    return {
      metricId: metric.metricId,
      name: metric.name,
      snapshot: metric.snapshot as PurchaseSearchSnapshot,
      updatedAt: metric.updatedAt,
    };
  }

  async deleteMetric(params: { userId: string; tableKey: string; metricId: string }) {
    return this.storage.deleteMetric(params);
  }
}
