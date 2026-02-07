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
      variantId: e.variantId,
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
      variantId?: string;
      from?: Date;
      to?: Date;
      docId?: string;
    },
    tx?: TransactionContext,
  ): Promise<LedgerEntry[]> {
    const repo = this.getRepo(tx);
    const where: any = {};
    
    if (params.warehouseId) where.warehouseId = params.warehouseId;
    if (params.variantId) where.variantId = params.variantId;
    if (params.docId) where.docId = params.docId;

    const { from, to } = this.normalizeRange(params);

    if (from && to) {
      where.createdAt = Between(from, to);
    } else if (from) {
      where.createdAt = MoreThanOrEqual(from);
    } else if (to) {
      where.createdAt = LessThanOrEqual(to);
    }
    const rows = await repo.find({ where, order: { id: 'DESC' } });
    return rows.map(
      (r) =>
        new LedgerEntry(
          r.id,
          r.docId,
          r.warehouseId,
          r.variantId,
          r.direction as any,
          r.quantity,
          r.unitCost ?? null,
          r.locationId,
          r.createdAt,
        ),
    );
  }
}
