import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PurchaseSearchRepository, PurchaseSearchStateRecord } from "src/modules/purchases/domain/ports/purchase-search.repository";
import { PurchaseSearchRecentEntity } from "../entities/purchase-search-recent.entity";
import { PurchaseSearchMetricEntity } from "../entities/purchase-search-metric.entity";
import { PurchaseSearchSnapshot } from "src/modules/purchases/application/dtos/purchase-search/purchase-search-snapshot";
import { createPurchaseSearchSnapshotHash } from "src/modules/purchases/application/support/purchase-search.utils";
import { SupplierEntity } from "src/modules/suppliers/adapters/out/persistence/typeorm/entities/supplier.entity";
import { WarehouseEntity } from "src/modules/warehouses/adapters/out/persistence/typeorm/entities/warehouse";

@Injectable()
export class PurchaseSearchTypeormRepository implements PurchaseSearchRepository {
  constructor(
    @InjectRepository(PurchaseSearchRecentEntity)
    private readonly recentRepo: Repository<PurchaseSearchRecentEntity>,
    @InjectRepository(PurchaseSearchMetricEntity)
    private readonly metricRepo: Repository<PurchaseSearchMetricEntity>,
    @InjectRepository(SupplierEntity)
    private readonly supplierRepo: Repository<SupplierEntity>,
    @InjectRepository(WarehouseEntity)
    private readonly warehouseRepo: Repository<WarehouseEntity>,
  ) {}

  async touchRecentSearch(params: {
    userId: string;
    tableKey: string;
    snapshot: PurchaseSearchSnapshot;
  }): Promise<void> {
    const snapshotHash = createPurchaseSearchSnapshotHash(params.snapshot);
    const now = new Date();
    const existing = await this.recentRepo.findOne({
      where: {
        userId: params.userId,
        tableKey: params.tableKey,
        snapshotHash,
      },
    });

    if (existing) {
      existing.snapshot = params.snapshot;
      existing.lastUsedAt = now;
      await this.recentRepo.save(existing);
    } else {
      await this.recentRepo.save(
        this.recentRepo.create({
          userId: params.userId,
          tableKey: params.tableKey,
          snapshotHash,
          snapshot: params.snapshot,
          lastUsedAt: now,
        }),
      );
    }

    const staleRows = await this.recentRepo
      .createQueryBuilder("recent")
      .where("recent.userId = :userId", { userId: params.userId })
      .andWhere("recent.tableKey = :tableKey", { tableKey: params.tableKey })
      .orderBy("recent.lastUsedAt", "DESC")
      .addOrderBy("recent.createdAt", "DESC")
      .skip(3)
      .getMany();

    if (staleRows.length) {
      await this.recentRepo.remove(staleRows);
    }
  }

  async listState(params: { userId: string; tableKey: string }): Promise<PurchaseSearchStateRecord> {
    const [recent, metrics, suppliers, warehouses] = await Promise.all([
      this.recentRepo.find({
        where: { userId: params.userId, tableKey: params.tableKey },
        order: { lastUsedAt: "DESC", createdAt: "DESC" },
        take: 3,
      }),
      this.metricRepo.find({
        where: { userId: params.userId, tableKey: params.tableKey },
        order: { updatedAt: "DESC", createdAt: "DESC" },
      }),
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
      recent: recent.map((row) => ({
        recentId: row.id,
        snapshot: row.snapshot,
        lastUsedAt: row.lastUsedAt,
      })),
      metrics: metrics.map((row) => ({
        metricId: row.id,
        name: row.name,
        snapshot: row.snapshot,
        updatedAt: row.updatedAt,
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
    snapshot: PurchaseSearchSnapshot;
  }) {
    const saved = await this.metricRepo.save(
      this.metricRepo.create({
        userId: params.userId,
        tableKey: params.tableKey,
        name: params.name,
        snapshot: params.snapshot,
      }),
    );

    return {
      metricId: saved.id,
      name: saved.name,
      snapshot: saved.snapshot,
      updatedAt: saved.updatedAt,
    };
  }

  async deleteMetric(params: { userId: string; tableKey: string; metricId: string }) {
    const result = await this.metricRepo.delete({
      id: params.metricId,
      userId: params.userId,
      tableKey: params.tableKey,
    });

    return Boolean(result.affected);
  }
}
