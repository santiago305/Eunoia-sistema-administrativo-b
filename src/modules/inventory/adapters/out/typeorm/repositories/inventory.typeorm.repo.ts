import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InventoryRepository } from '../../../../domain/ports/inventory.repository.port';
import { Inventory } from '../../../../domain/entities/inventory';
import { InventoryEntity } from '../entities/inventory.entity';
import { TransactionContext } from '../../../../domain/ports/unit-of-work.port';
import { TypeormTransactionContext } from '../uow/typeorm.transaction-context';

@Injectable()
export class InventoryTypeormRepository implements InventoryRepository {
  constructor(
    @InjectRepository(InventoryEntity)
    private readonly repo: Repository<InventoryEntity>,
  ) {}

  private getManager(tx?: TransactionContext) {
    if (tx && (tx as TypeormTransactionContext).manager) {
      return (tx as TypeormTransactionContext).manager;
    }
    return this.repo.manager;
  }

  private getRepo(tx?: TransactionContext) {
    return this.getManager(tx).getRepository(InventoryEntity);
  }


  async getSnapshot(
    params: {
      warehouseId: string;
      stockItemId: string;
      locationId?: string;
    },
    tx?: TransactionContext,
  ): Promise<Inventory | null> {
    const repo = this.getRepo(tx);
    const row = await repo.findOne({
      where: {
        warehouseId: params.warehouseId,
        stockItemId: params.stockItemId,
        locationId: params.locationId ?? null,
      },
    });

    if (!row) return null;

    return new Inventory(
      row.warehouseId,
      row.stockItemId,
      row.onHand,
      row.reserved,
      row.available,
      row.locationId,
      row.updatedAt,
    );
  }

  async findByKeys(
    keys: Array<{ warehouseId: string; stockItemId: string; locationId?: string }>,
    tx?: TransactionContext,
  ): Promise<Inventory[]> {
    const snapshots = await Promise.all(keys.map((k) => this.getSnapshot(k, tx)));
    return snapshots.filter((s): s is Inventory => !!s);
  }

  async listSnapshots(
    params: {
      warehouseId?: string;
      stockItemId?: string;
      locationId?: string;
    },
    tx?: TransactionContext,
  ): Promise<Inventory[]> {
    const repo = this.getRepo(tx);
    const qb = repo.createQueryBuilder('i');

    if (params.warehouseId) {
      qb.andWhere('i.warehouseId = :warehouseId', { warehouseId: params.warehouseId });
    }
    if (params.stockItemId) {
      qb.andWhere('i.stockItemId = :stockItemId', { stockItemId: params.stockItemId });
    }
    if (params.locationId !== undefined) {
      qb.andWhere('i.locationId = :locationId', { locationId: params.locationId });
    }

    const rows = await qb.orderBy('i.updatedAt', 'DESC').getMany();
    return rows.map(
      (row) =>
        new Inventory(
          row.warehouseId,
          row.stockItemId,
          row.onHand,
          row.reserved,
          row.available,
          row.locationId,
          row.updatedAt,
        ),
    );
  }

  async upsertSnapshot(snapshot: Inventory, tx?: TransactionContext): Promise<void> {
    const repo = this.getRepo(tx);
    await repo.save({
      warehouseId: snapshot.warehouseId,
      stockItemId: snapshot.stockItemId,
      locationId: snapshot.locationId ?? null,
      onHand: snapshot.onHand,
      reserved: snapshot.reserved,
      available: snapshot.available,
    });
  }

  async incrementOnHand(
    params: {
      warehouseId: string;
      stockItemId: string;
      locationId?: string;
      delta: number;
    },
    tx?: TransactionContext,
  ): Promise<Inventory> {
    const current = await this.getSnapshot(params, tx);
    const onHand = (current?.onHand ?? 0) + params.delta;
    const reserved = current?.reserved ?? 0;
    const snapshot = new Inventory(
      params.warehouseId,
      params.stockItemId,
      onHand,
      reserved,
      onHand - reserved,
      params.locationId,
    );
    await this.upsertSnapshot(snapshot, tx);
    return snapshot;
  }

  async incrementReserved(
    params: {
      warehouseId: string;
      stockItemId: string;
      locationId?: string;
      delta: number;
    },
    tx?: TransactionContext,
  ): Promise<Inventory> {
    const current = await this.getSnapshot(params, tx);
    const onHand = current?.onHand ?? 0;
    const reserved = (current?.reserved ?? 0) + params.delta;
    const snapshot = new Inventory(
      params.warehouseId,
      params.stockItemId,
      onHand,
      reserved,
      onHand - reserved,
      params.locationId,
    );
    await this.upsertSnapshot(snapshot, tx);
    return snapshot;
  }
}

