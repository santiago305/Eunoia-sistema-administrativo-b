import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { createHash } from "crypto";
import { Repository } from "typeorm";
import {
  ListingSearchStateRecord,
  ListingSearchStorageRepository,
} from "src/shared/listing-search/domain/listing-search.repository";
import { ListingSearchSnapshot } from "src/shared/listing-search/domain/listing-search-snapshot";
import { ListingSearchMetricEntity } from "../entities/listing-search-metric.entity";
import { ListingSearchRecentEntity } from "../entities/listing-search-recent.entity";

@Injectable()
export class ListingSearchTypeormRepository implements ListingSearchStorageRepository {
  constructor(
    @InjectRepository(ListingSearchRecentEntity)
    private readonly recentRepo: Repository<ListingSearchRecentEntity>,
    @InjectRepository(ListingSearchMetricEntity)
    private readonly metricRepo: Repository<ListingSearchMetricEntity>,
  ) {}

  private createSnapshotHash(snapshot: ListingSearchSnapshot) {
    return createHash("sha256")
      .update(JSON.stringify(snapshot))
      .digest("hex");
  }

  async touchRecentSearch(params: {
    userId: string;
    tableKey: string;
    snapshot: ListingSearchSnapshot;
  }): Promise<void> {
    const snapshotHash = this.createSnapshotHash(params.snapshot);
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

  async listState(params: { userId: string; tableKey: string }): Promise<ListingSearchStateRecord> {
    const [recent, metrics] = await Promise.all([
      this.recentRepo.find({
        where: { userId: params.userId, tableKey: params.tableKey },
        order: { lastUsedAt: "DESC", createdAt: "DESC" },
        take: 3,
      }),
      this.metricRepo.find({
        where: { userId: params.userId, tableKey: params.tableKey },
        order: { updatedAt: "DESC", createdAt: "DESC" },
      }),
    ]);

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
    };
  }

  async createMetric(params: {
    userId: string;
    tableKey: string;
    name: string;
    snapshot: ListingSearchSnapshot;
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
