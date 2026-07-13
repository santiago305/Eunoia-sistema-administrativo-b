import { Inject, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { SupplierEntity } from "src/modules/suppliers/adapters/out/persistence/typeorm/entities/supplier.entity";
import {
  LISTING_SEARCH_STORAGE,
  ListingSearchStorageRepository,
} from "src/shared/listing-search/domain/listing-search.repository";
import {
  RecurringPurchaseSearchRepository,
  RecurringPurchaseSearchStateRecord,
} from "src/modules/recurring-purchases/domain/ports/recurring-purchase-search.repository";
import { RecurringPurchaseSearchSnapshot } from "src/modules/recurring-purchases/application/dtos/recurring-purchase-search/recurring-purchase-search-snapshot";

@Injectable()
export class RecurringPurchaseSearchTypeormRepository implements RecurringPurchaseSearchRepository {
  constructor(
    @Inject(LISTING_SEARCH_STORAGE)
    private readonly storage: ListingSearchStorageRepository,
    @InjectRepository(SupplierEntity)
    private readonly supplierRepo: Repository<SupplierEntity>,
  ) {}

  async touchRecentSearch(params: Parameters<RecurringPurchaseSearchRepository["touchRecentSearch"]>[0]) {
    await this.storage.touchRecentSearch(params);
  }

  async listState(params: { userId: string; tableKey: string }): Promise<RecurringPurchaseSearchStateRecord> {
    const [state, suppliers] = await Promise.all([
      this.storage.listState(params),
      this.supplierRepo.find({ where: { isActive: true } }),
    ]);

    const orderedSuppliers = [...suppliers].sort((left, right) => {
      const leftLabel = [left.name, left.lastName].filter(Boolean).join(" ").trim() || left.tradeName || left.id;
      const rightLabel = [right.name, right.lastName].filter(Boolean).join(" ").trim() || right.tradeName || right.id;
      return leftLabel.localeCompare(rightLabel, "es", { sensitivity: "base" });
    });

    return {
      recent: state.recent.map((item) => ({
        recentId: item.recentId,
        snapshot: item.snapshot as RecurringPurchaseSearchSnapshot,
        lastUsedAt: item.lastUsedAt,
      })),
      metrics: state.metrics.map((item) => ({
        metricId: item.metricId,
        name: item.name,
        snapshot: item.snapshot as RecurringPurchaseSearchSnapshot,
        updatedAt: item.updatedAt,
      })),
      suppliers: orderedSuppliers.map((row) => {
        const fullName = [row.name, row.lastName].filter(Boolean).join(" ").trim();
        const display = (row.tradeName || fullName || "").trim() || row.id;
        const doc = row.documentNumber ? ` (${row.documentNumber})` : "";
        return {
          supplierId: row.id,
          label: `${display}${doc}`.trim(),
        };
      }),
    };
  }

  async createMetric(params: Parameters<RecurringPurchaseSearchRepository["createMetric"]>[0]) {
    const metric = await this.storage.createMetric(params);
    return {
      metricId: metric.metricId,
      name: metric.name,
      snapshot: metric.snapshot as RecurringPurchaseSearchSnapshot,
      updatedAt: metric.updatedAt,
    };
  }

  async deleteMetric(params: { userId: string; tableKey: string; metricId: string }) {
    return this.storage.deleteMetric(params);
  }
}
