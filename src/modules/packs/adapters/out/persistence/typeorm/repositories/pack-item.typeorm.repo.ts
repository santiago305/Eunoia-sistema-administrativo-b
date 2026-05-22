import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, Repository } from "typeorm";
import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { TypeormTransactionContext } from "src/shared/domain/ports/typeorm-transaction-context";
import { PackItemRepository } from "src/modules/packs/domain/ports/pack-item.repository";
import { PackItem } from "src/modules/packs/domain/entities/pack-item";
import { PackFactory } from "src/modules/packs/domain/factories/pack.factory";
import { PackId } from "src/modules/packs/domain/value-objects/pack-id.vo";
import { PackItemId } from "src/modules/packs/domain/value-objects/pack-item-id.vo";
import { PackItemEntity } from "../entities/pack-item.entity";

@Injectable()
export class PackItemTypeormRepository implements PackItemRepository {
  constructor(
    @InjectRepository(PackItemEntity)
    private readonly repo: Repository<PackItemEntity>,
  ) {}

  private getManager(tx?: TransactionContext): EntityManager {
    if (tx && (tx as TypeormTransactionContext).manager) {
      return (tx as TypeormTransactionContext).manager;
    }
    return this.repo.manager;
  }

  private getRepo(tx?: TransactionContext) {
    return this.getManager(tx).getRepository(PackItemEntity);
  }

  private toDomain(row: PackItemEntity): PackItem {
    return PackFactory.createPackItem({
      packItemId: new PackItemId(row.id),
      packId: new PackId(row.packId),
      skuId: row.skuId,
      quantity: Number(row.quantity ?? 0),
      price: Number(row.price ?? 0),
    });
  }

  async createMany(items: PackItem[], tx?: TransactionContext): Promise<void> {
    const repo = this.getRepo(tx);
    const rows = items.map((item) => repo.create({
      id: item.packItemId.value,
      packId: item.packId.value,
      skuId: item.skuId,
      quantity: item.quantity as any,
      price: item.price as any,
    }));
    await repo.save(rows);
  }

  async listByPackId(
    packId: string,
    tx?: TransactionContext,
  ): Promise<Array<{ id: string; skuId: string; quantity: number; price: number }>> {
    const repo = this.getRepo(tx);
    const rows = await repo.find({
      where: { packId },
      order: { id: "ASC" },
    });

    return rows.map((row) => ({
      id: row.id,
      skuId: row.skuId,
      quantity: Number(row.quantity ?? 0),
      price: Number(row.price ?? 0),
    }));
  }

  async deleteByIds(ids: string[], tx?: TransactionContext): Promise<void> {
    if (!ids.length) return;
    const repo = this.getRepo(tx);
    await repo.delete(ids);
  }

  async updateMany(
    patch: Array<{ id: string; quantity: number; price: number }>,
    tx?: TransactionContext,
  ): Promise<void> {
    const repo = this.getRepo(tx);
    for (const item of patch) {
      await repo.update(
        { id: item.id },
        { quantity: item.quantity as any, price: item.price as any },
      );
    }
  }
}
