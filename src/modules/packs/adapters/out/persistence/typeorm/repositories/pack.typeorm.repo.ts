import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, Repository } from "typeorm";
import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { TypeormTransactionContext } from "src/shared/domain/ports/typeorm-transaction-context";
import { PackRepository } from "src/modules/packs/domain/ports/pack.repository";
import { Pack } from "src/modules/packs/domain/entities/pack";
import { PackFactory } from "src/modules/packs/domain/factories/pack.factory";
import { PackId } from "src/modules/packs/domain/value-objects/pack-id.vo";
import { PackEntity } from "../entities/pack.entity";
import { PackItemEntity } from "../entities/pack-item.entity";

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

  async findByIdWithItems(packId: string, tx?: TransactionContext) {
    const manager = this.getManager(tx);
    const packRow = await manager.getRepository(PackEntity).findOne({ where: { id: packId } });
    if (!packRow) return null;

    const itemRows = await manager.getRepository(PackItemEntity).find({
      where: { packId },
      relations: { sku: true },
      order: { id: "ASC" },
    });

    return {
      pack: this.toDomain(packRow),
      items: itemRows.map((row) => ({
        id: row.id,
        skuId: row.skuId,
        quantity: Number(row.quantity ?? 0),
        price: Number(row.price ?? 0),
        lineTotal: Number(row.quantity ?? 0) * Number(row.price ?? 0),
        sku: {
          id: row.sku?.id,
          backendSku: row.sku?.backendSku,
          customSku: row.sku?.customSku ?? null,
          name: row.sku?.name,
          barcode: row.sku?.barcode ?? null,
          price: Number(row.sku?.price ?? 0),
          isActive: Boolean(row.sku?.isActive),
        },
      })),
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

  async setActive(packId: string, isActive: boolean, tx?: TransactionContext): Promise<void> {
    await this.getRepo(tx).update({ id: packId }, { isActive });
  }

  async list(
    params: { q?: string; isActive?: boolean; page?: number; limit?: number },
    tx?: TransactionContext,
  ): Promise<{ items: Pack[]; total: number }> {
    const repo = this.getRepo(tx);
    const qb = repo.createQueryBuilder("p");

    if (params.isActive !== undefined) {
      qb.andWhere("p.isActive = :isActive", { isActive: params.isActive });
    }

    if (params.q?.trim()) {
      const q = params.q.trim();
      qb.andWhere(
        `(
          unaccent(coalesce(p.description, '')) ILIKE unaccent(:q)
          OR CAST(p.total AS text) ILIKE :q
        )`,
        { q: `%${q}%` },
      );
    }

    const page = params.page ?? 1;
    const limit = params.limit ?? 10;

    const [rows, total] = await qb
      .orderBy("p.createdAt", "DESC")
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { items: rows.map((r) => this.toDomain(r)), total };
  }
}

