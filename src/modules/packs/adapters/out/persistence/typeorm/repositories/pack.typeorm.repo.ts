import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, In, Repository } from "typeorm";
import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { TypeormTransactionContext } from "src/shared/domain/ports/typeorm-transaction-context";
import { PackRepository, PackWithItems } from "src/modules/packs/domain/ports/pack.repository";
import { Pack } from "src/modules/packs/domain/entities/pack";
import { PackFactory } from "src/modules/packs/domain/factories/pack.factory";
import { PackId } from "src/modules/packs/domain/value-objects/pack-id.vo";
import { PackEntity } from "../entities/pack.entity";
import { PackItemEntity } from "../entities/pack-item.entity";
import { ProductCatalogSkuEntity } from "src/modules/product-catalog/adapters/out/persistence/typeorm/entities/sku.entity";
import { ProductCatalogSkuAttributeValueEntity } from "src/modules/product-catalog/adapters/out/persistence/typeorm/entities/sku-attribute-value.entity";
import { ProductCatalogAttributeEntity } from "src/modules/product-catalog/adapters/out/persistence/typeorm/entities/attribute.entity";
import { PackSearchRule, PackSearchFields, PackSearchOperators } from "src/modules/packs/application/dtos/pack-search/pack-search-snapshot";
import { matchSearchOptionIds, PACK_ACTIVE_STATE_SEARCH_OPTIONS, sanitizePackSearchFilters } from "src/modules/packs/application/support/pack-search.utils";

@Injectable()
export class PackTypeormRepository implements PackRepository {
  constructor(
    @InjectRepository(PackEntity)
    private readonly repo: Repository<PackEntity>,
  ) {}

  private getManager(tx?: TransactionContext): EntityManager {
    if (tx && (tx as TypeormTransactionContext).manager) {
      return (tx as TypeormTransactionContext).manager;
    }
    return this.repo.manager;
  }

  private getRepo(tx?: TransactionContext) {
    return this.getManager(tx).getRepository(PackEntity);
  }

  private toDomain(row: PackEntity): Pack {
    return PackFactory.createPack({
      packId: new PackId(row.id),
      description: row.description,
      total: Number(row.total ?? 0),
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  async findById(packId: string, tx?: TransactionContext): Promise<Pack | null> {
    const row = await this.getRepo(tx).findOne({ where: { id: packId } });
    return row ? this.toDomain(row) : null;
  }

  async findByIdWithItems(packId: string, tx?: TransactionContext): Promise<PackWithItems | null> {
    const manager = this.getManager(tx);
    const packRow = await manager.getRepository(PackEntity).findOne({ where: { id: packId } });
    if (!packRow) return null;

    const itemRows = await manager.getRepository(PackItemEntity).find({
      where: { packId },
      relations: { sku: true },
      order: { id: "ASC" },
    });

    const skuIds = Array.from(
      new Set(itemRows.map((row) => row.skuId).filter(Boolean)),
    ) as string[];

    const attributesBySkuId = await this.loadSkuAttributes(manager, skuIds);

    return {
      pack: this.toDomain(packRow),
      items: itemRows.map((row) => this.toItemDetails(row, attributesBySkuId)),
    };
  }

  private async loadSkuAttributes(
    manager: EntityManager,
    skuIds: string[],
  ): Promise<Map<string, Array<{ code: string; name: string | null; value: string }>>> {
    if (!skuIds.length) return new Map();

    const rows = await manager
      .getRepository(ProductCatalogSkuAttributeValueEntity)
      .createQueryBuilder("sav")
      .innerJoin(ProductCatalogAttributeEntity, "a", "a.attribute_id = sav.attribute_id")
      .where("sav.sku_id IN (:...skuIds)", { skuIds })
      .select([
        "sav.sku_id AS sku_id",
        "sav.value AS value",
        "a.code AS code",
        "a.name AS name",
      ])
      .orderBy("a.code", "ASC")
      .getRawMany<{ sku_id: string; code: string; name: string | null; value: string }>();

    const map = new Map<string, Array<{ code: string; name: string | null; value: string }>>();
    for (const row of rows) {
      const list = map.get(row.sku_id) ?? [];
      list.push({ code: row.code, name: row.name, value: row.value });
      map.set(row.sku_id, list);
    }
    return map;
  }

  private toCents(value: number): number {
    return Math.round((value ?? 0) * 100);
  }

  private computeLineTotal(quantity: number, price: number): number {
    const qtyCents = this.toCents(quantity);
    const priceCents = this.toCents(price);
    const lineCents = Math.round((qtyCents * priceCents) / 100);
    return lineCents / 100;
  }

  private toItemDetails(
    row: PackItemEntity,
    attributesBySkuId: Map<string, Array<{ code: string; name: string | null; value: string }>>,
  ): PackWithItems["items"][number] {
    if (!row.sku) {
      throw new Error("SKU relation not loaded for pack item");
    }

    const quantity = Number(row.quantity ?? 0);
    const price = Number(row.price ?? 0);

    return {
      id: row.id,
      skuId: row.skuId,
      quantity,
      price,
      lineTotal: this.computeLineTotal(quantity, price),
      sku: {
        id: row.sku.id,
        backendSku: row.sku.backendSku,
        customSku: row.sku.customSku ?? null,
        name: row.sku.name,
        barcode: row.sku.barcode ?? null,
        price: Number(row.sku.price ?? 0),
        image: row.sku.image ?? null,
        isActive: Boolean(row.sku.isActive),
        attributes: attributesBySkuId.get(row.sku.id) ?? [],
      },
    };
  }

  async create(pack: Pack, tx?: TransactionContext): Promise<Pack> {
    const repo = this.getRepo(tx);
    const row = repo.create({
      id: pack.packId.value,
      description: pack.description,
      total: pack.total,
      isActive: pack.isActive ?? true,
      createdAt: pack.createdAt ?? undefined,
      updatedAt: pack.updatedAt ?? undefined,
    });
    const saved = await repo.save(row);
    return this.toDomain(saved);
  }

  async update(pack: Pack, tx?: TransactionContext): Promise<Pack> {
    const repo = this.getRepo(tx);
    const row = await repo.preload({
      id: pack.packId.value,
      description: pack.description,
      total: pack.total as any,
      isActive: pack.isActive,
      updatedAt: pack.updatedAt ?? undefined,
    });

    const saved = await repo.save(
      row ??
        repo.create({
          id: pack.packId.value,
          description: pack.description,
          total: pack.total,
          isActive: pack.isActive,
          createdAt: pack.createdAt ?? undefined,
          updatedAt: pack.updatedAt ?? undefined,
        }),
    );

    return this.toDomain(saved);
  }

  async setActive(packId: string, isActive: boolean, tx?: TransactionContext): Promise<void> {
    await this.getRepo(tx).update({ id: packId }, { isActive });
  }

  async list(
    params: { q?: string; isActive?: boolean; filters?: PackSearchRule[]; page?: number; limit?: number },
    tx?: TransactionContext,
  ): Promise<{ items: PackWithItems[]; total: number }> {
    const repo = this.getRepo(tx);
    const qb = repo.createQueryBuilder("p");

    if (params.isActive !== undefined) {
      qb.andWhere("p.isActive = :isActive", { isActive: params.isActive });
    }

    const filters = sanitizePackSearchFilters(params.filters ?? []);
    const q = params.q?.trim();
    const needsSkuJoin = Boolean(q) || filters.some((filter) => filter.field === PackSearchFields.SKU_TEXT);

    if (needsSkuJoin) {
      qb
        .leftJoin(PackItemEntity, "pi", "pi.packId = p.id")
        .leftJoin(ProductCatalogSkuEntity, "sku", "sku.id = pi.skuId")
        .distinct(true);
    }

    filters.forEach((filter, index) => {
      const fieldParam = `filter_${index}`;
      const valuesParam = `${fieldParam}_values`;
      const valueParam = `${fieldParam}_value`;
      const catalogOperator = filter.mode === "exclude" ? "NOT IN" : "IN";

      switch (filter.field) {
        case PackSearchFields.IS_ACTIVE:
          if (filter.values?.length) {
            qb.andWhere(`p.isActive ${catalogOperator} (:...${valuesParam})`, {
              [valuesParam]: filter.values.map((value) => value === "true"),
            });
          }
          break;
        case PackSearchFields.DESCRIPTION: {
          if (!filter.value) break;
          const column = "p.description";

          if (filter.operator === PackSearchOperators.EQ) {
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
        case PackSearchFields.TOTAL: {
          if (!filter.value) break;
          const total = Number(filter.value);
          if (!Number.isFinite(total)) break;

          if (filter.operator === PackSearchOperators.EQ) {
            qb.andWhere(`p.total = :${valueParam}`, { [valueParam]: total });
          } else if (filter.operator === PackSearchOperators.GTE) {
            qb.andWhere(`p.total >= :${valueParam}`, { [valueParam]: total });
          } else if (filter.operator === PackSearchOperators.LTE) {
            qb.andWhere(`p.total <= :${valueParam}`, { [valueParam]: total });
          }
          break;
        }
        case PackSearchFields.SKU_TEXT: {
          if (!filter.value) break;
          qb.andWhere(
            [
              "(",
              "unaccent(coalesce(sku.name, '')) ILIKE unaccent(:skuText)",
              "OR unaccent(coalesce(sku.backendSku, '')) ILIKE unaccent(:skuText)",
              "OR unaccent(coalesce(sku.customSku, '')) ILIKE unaccent(:skuText)",
              "OR unaccent(coalesce(sku.barcode, '')) ILIKE unaccent(:skuText)",
              ")",
            ].join(" "),
            { skuText: `%${filter.value}%` },
          );
          break;
        }
        default:
          break;
      }
    });

    if (q) {
      const matchedActiveStates = matchSearchOptionIds(q, PACK_ACTIVE_STATE_SEARCH_OPTIONS);
      qb.andWhere(
        [
          "(",
          "unaccent(coalesce(p.description, '')) ILIKE unaccent(:q)",
          "OR CAST(p.total AS text) ILIKE :q",
          needsSkuJoin ? "OR unaccent(coalesce(sku.name, '')) ILIKE unaccent(:q)" : "",
          needsSkuJoin ? "OR unaccent(coalesce(sku.backendSku, '')) ILIKE unaccent(:q)" : "",
          needsSkuJoin ? "OR unaccent(coalesce(sku.customSku, '')) ILIKE unaccent(:q)" : "",
          needsSkuJoin ? "OR unaccent(coalesce(sku.barcode, '')) ILIKE unaccent(:q)" : "",
          matchedActiveStates.length ? "OR p.isActive IN (:...matchedActiveStates)" : "",
          ")",
        ].filter(Boolean).join(" "),
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
      .orderBy("p.createdAt", "DESC")
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    if (!rows.length) {
      return { items: [], total };
    }

    const manager = this.getManager(tx);
    const packIds = rows.map((row) => row.id);

    const itemRows = await manager.getRepository(PackItemEntity).find({
      where: { packId: In(packIds) },
      relations: { sku: true },
      order: { packId: "ASC", id: "ASC" },
    });

    const skuIds = Array.from(new Set(itemRows.map((row) => row.skuId).filter(Boolean))) as string[];
    const attributesBySkuId = await this.loadSkuAttributes(manager, skuIds);

    const itemsByPackId = new Map<string, PackItemEntity[]>();
    for (const row of itemRows) {
      const list = itemsByPackId.get(row.packId) ?? [];
      list.push(row);
      itemsByPackId.set(row.packId, list);
    }

    return {
      items: rows.map((packRow) => ({
        pack: this.toDomain(packRow),
        items: (itemsByPackId.get(packRow.id) ?? []).map((itemRow) =>
          this.toItemDetails(itemRow, attributesBySkuId),
        ),
      })),
      total,
    };
  }
}
