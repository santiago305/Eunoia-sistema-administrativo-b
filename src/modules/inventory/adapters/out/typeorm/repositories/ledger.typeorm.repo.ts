import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { LedgerRepository } from '../../../../domain/ports/ledger.repository.port';
import { LedgerEntry } from '../../../../domain/entities/ledger-entry';
import { InventoryLedgerEntity } from '../entities/inventory_ledger.entity';
import { TransactionContext } from '../../../../domain/ports/unit-of-work.port';
import { TypeormTransactionContext } from '../uow/typeorm.transaction-context';

@Injectable()
export class LedgerTypeormRepository implements LedgerRepository {
  constructor(
    @InjectRepository(InventoryLedgerEntity)
    private readonly repo: Repository<InventoryLedgerEntity>,
  ) {}
  private getManager(tx?: TransactionContext) {
  if (tx && (tx as TypeormTransactionContext).manager) {
    return (tx as TypeormTransactionContext).manager;
  }
  return this.repo.manager;
}

private getRepo(tx?: TransactionContext) {
  return this.getManager(tx).getRepository(InventoryLedgerEntity);
}
  async append(entries: LedgerEntry[], tx?: TransactionContext): Promise<void> {
    const repo = this.getRepo(tx);
    const rows = entries.map((e) => ({
      docId: e.docId,
      warehouseId: e.warehouseId,
      locationId: e.locationId ?? null,
      stockItemId: e.stockItemId,
      direction: e.direction,
      quantity: e.quantity,
      unitCost: e.unitCost ?? null,
    }));
    await repo.save(rows);
  }
  private normalizeRange(params: { from?: Date; to?: Date }) {
    let from = params.from ? new Date(params.from) : undefined;
    let to = params.to ? new Date(params.to) : undefined;

    if (from) from.setHours(0, 0, 0, 0);
    if (to) to.setHours(23, 59, 59, 999);

    return { from, to };
  }

  async list(
    params: {
      warehouseId?: string;
      stockItemId?: string;
      locationId?: string;
      from?: Date;
      to?: Date;
      docId?: string;
      page?:number;
      limit?: number;
    },
    tx?: TransactionContext,
  ): Promise<{
    items: LedgerEntry[];
    total: number;
    page: number;
    limit: number;
  }> {
    const repo = this.getRepo(tx);
    const where: any = {};
    
    if (params.warehouseId) where.warehouseId = params.warehouseId;
    if (params.stockItemId) where.stockItemId = params.stockItemId;
    if (params.docId) where.docId = params.docId;
    if (params.locationId !== undefined) {
        where.locationId = params.locationId;
    }
    const { from, to } = this.normalizeRange(params);

    if (from && to) {
      where.createdAt = Between(from, to);
    } else if (from) {
      where.createdAt = MoreThanOrEqual(from);
    } else if (to) {
      where.createdAt = LessThanOrEqual(to);
    }
    const page = params.page && params.page > 0 ? params.page : 1;
    const limit = params.limit && params.limit > 0 ? params.limit : 20;
    const skip = (page - 1) * limit;

    const [rows, total] = await repo.findAndCount({
      where,
      order: { id: 'DESC' },
      skip,
      take: limit,
    });
    return {
      items: rows.map(
        (r) =>
          new LedgerEntry(
            r.id,
            r.docId,
            r.warehouseId,
            r.stockItemId,
            r.direction as any,
            r.quantity,
            r.unitCost ?? null,
            r.locationId,
            r.createdAt,
          ),
      ),
      total,
      page,
      limit,
    };
  }
  
}

