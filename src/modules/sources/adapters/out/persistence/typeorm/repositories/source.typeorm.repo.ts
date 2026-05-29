import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, Repository } from "typeorm";
import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { TypeormTransactionContext } from "src/shared/domain/ports/typeorm-transaction-context";
import { SourceRepository } from "src/modules/sources/domain/ports/source.repository";
import { Source } from "src/modules/sources/domain/entities/source";
import { SourceFactory } from "src/modules/sources/domain/factories/source.factory";
import { SourceId } from "src/modules/sources/domain/value-objects/source-id.vo";
import { SourceSearchRule } from "src/modules/sources/application/dtos/source-search/source-search-snapshot";
import {
  SOURCE_ACTIVE_STATE_SEARCH_OPTIONS,
  matchSearchOptionIds,
  sanitizeSourceSearchFilters,
} from "src/modules/sources/application/support/source-search.utils";
import {
  SourceSearchFields,
  SourceSearchOperators,
} from "src/modules/sources/application/dtos/source-search/source-search-snapshot";
import { SourceEntity } from "../entities/source.entity";

@Injectable()
export class SourceTypeormRepository implements SourceRepository {
  constructor(
    @InjectRepository(SourceEntity)
    private readonly repo: Repository<SourceEntity>,
  ) {}

  private getManager(tx?: TransactionContext): EntityManager {
    if (tx && (tx as TypeormTransactionContext).manager) {
      return (tx as TypeormTransactionContext).manager;
    }
    return this.repo.manager;
  }

  private getRepo(tx?: TransactionContext) {
    return this.getManager(tx).getRepository(SourceEntity);
  }

  private toDomain(row: SourceEntity): Source {
    return SourceFactory.createSource({
      sourceId: new SourceId(row.id),
      name: row.name,
      detail: row.detail ?? undefined,
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  async findById(sourceId: string, tx?: TransactionContext): Promise<Source | null> {
    const row = await this.getRepo(tx).findOne({ where: { id: sourceId } });
    return row ? this.toDomain(row) : null;
  }

  async create(source: Source, tx?: TransactionContext): Promise<Source> {
    const repo = this.getRepo(tx);
    const row = repo.create({
      id: source.sourceId.value,
      name: source.name,
      detail: source.detail ?? null,
      isActive: source.isActive ?? true,
      createdAt: source.createdAt ?? undefined,
      updatedAt: source.updatedAt ?? undefined,
    });
    const saved = await repo.save(row);
    return this.toDomain(saved);
  }

  async update(
    params: {
      sourceId: string;
      name?: string;
      detail?: string;
      isActive?: boolean;
      updatedAt?: Date;
    },
    tx?: TransactionContext,
  ): Promise<Source | null> {
    const repo = this.getRepo(tx);
    const patch: Partial<SourceEntity> = {};

    if (params.name !== undefined) patch.name = params.name;
    if (params.detail !== undefined) patch.detail = params.detail ?? null;
    if (params.isActive !== undefined) patch.isActive = params.isActive;
    if (params.updatedAt !== undefined) patch.updatedAt = params.updatedAt;

    await repo.update({ id: params.sourceId }, patch);
    const updated = await repo.findOne({ where: { id: params.sourceId } });
    return updated ? this.toDomain(updated) : null;
  }

  async setActive(sourceId: string, isActive: boolean, tx?: TransactionContext): Promise<void> {
    await this.getRepo(tx).update({ id: sourceId }, { isActive });
  }

  async list(
    params: { q?: string; isActive?: boolean; filters?: SourceSearchRule[]; page?: number; limit?: number },
    tx?: TransactionContext,
  ): Promise<{ items: Source[]; total: number }> {
    const repo = this.getRepo(tx);
    const qb = repo.createQueryBuilder("s");

    if (params.isActive !== undefined) {
      qb.andWhere("s.isActive = :isActive", { isActive: params.isActive });
    }

    const filters = sanitizeSourceSearchFilters(params.filters ?? []);
    filters.forEach((filter, index) => {
      const fieldParam = `filter_${index}`;
      const valuesParam = `${fieldParam}_values`;
      const valueParam = `${fieldParam}_value`;
      const catalogOperator = filter.mode === "exclude" ? "NOT IN" : "IN";

      switch (filter.field) {
        case SourceSearchFields.IS_ACTIVE:
          if (filter.values?.length) {
            qb.andWhere(`s.isActive ${catalogOperator} (:...${valuesParam})`, {
              [valuesParam]: filter.values.map((value) => value === "true"),
            });
          }
          break;
        case SourceSearchFields.NAME:
        case SourceSearchFields.DETAIL: {
          if (!filter.value) break;

          const column = filter.field === SourceSearchFields.NAME ? "s.name" : "s.detail";

          if (filter.operator === SourceSearchOperators.EQ) {
            qb.andWhere(`unaccent(coalesce(${column}, '')) = unaccent(:${valueParam})`, {
              [valueParam]: filter.value,
            });
          } else {
            qb.andWhere(`unaccent(coalesce(${column}, '')) ILIKE unaccent(:${valueParam})`, {
              [valueParam]: `%${filter.value}%`,
            });
          }
          break;
        }
        default:
          break;
      }
    });

    if (params.q) {
      const q = params.q.trim();
      const matchedActiveStates = matchSearchOptionIds(q, SOURCE_ACTIVE_STATE_SEARCH_OPTIONS);
      qb.andWhere(
        [
          "(",
          "unaccent(coalesce(s.name, '')) ILIKE unaccent(:q)",
          "OR unaccent(coalesce(s.detail, '')) ILIKE unaccent(:q)",
          matchedActiveStates.length ? "OR s.isActive IN (:...matchedActiveStates)" : "",
          ")",
        ].join(" "),
        {
          q: `%${q}%`,
          ...(matchedActiveStates.length
            ? { matchedActiveStates: matchedActiveStates.map((value) => value === "true") }
            : {}),
        },
      );
    }

    const page = params.page ?? 1;
    const limit = params.limit ?? 10;

    const [rows, total] = await qb
      .orderBy("s.createdAt", "DESC")
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { items: rows.map((r) => this.toDomain(r)), total };
  }
}

