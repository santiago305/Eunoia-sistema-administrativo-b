import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { StockItemEntity } from '../entities/stock-item.entity';
import { TransactionContext } from 'src/shared/domain/ports/transaction-context.port';
import { TypeormTransactionContext } from 'src/shared/domain/ports/typeorm-transaction-context';
import { StockItem } from 'src/modules/inventory/domain/entities/stock-item/stock-item';
import { StockItemType } from 'src/modules/inventory/domain/value-objects/stock-item-type';
import { StockItemRepository } from 'src/modules/inventory/application/ports/stock-item.repository.port';


@Injectable()
export class StockItemTypeormRepository implements StockItemRepository {
  constructor(
    @InjectRepository(StockItemEntity)
    private readonly repo: Repository<StockItemEntity>,
  ) {}

  private getManager(tx?: TransactionContext): EntityManager {
    if (tx && (tx as TypeormTransactionContext).manager) {
      return (tx as TypeormTransactionContext).manager;
    }
    return this.repo.manager;
  }

  private getRepo(tx?: TransactionContext) {
    return this.getManager(tx).getRepository(StockItemEntity);
  }

  private toDomain(row: StockItemEntity): StockItem {
    return new StockItem(
      row.id,
      row.type,
      row.isActive,
      row.productId ?? undefined,
      row.variantId ?? undefined,
      row.createdAt,
    );
  }

  async findById(stockItemId: string, tx?: TransactionContext): Promise<StockItem | null> {
    const row = await this.getRepo(tx).findOne({ where: { id: stockItemId } });
    return row ? this.toDomain(row) : null;
  }

  async findByProductId(productId: string, tx?: TransactionContext): Promise<StockItem | null> {
    const row = await this.getRepo(tx).findOne({ where: { productId } });
    return row ? this.toDomain(row) : null;
  }

  async findByVariantId(variantId: string, tx?: TransactionContext): Promise<StockItem | null> {
    const row = await this.getRepo(tx).findOne({ where: { variantId } });
    return row ? this.toDomain(row) : null;
  }

  async findByProductIdOrVariantId(itemId: string, tx?: TransactionContext): Promise<StockItem | null> {
    const row = await this.getRepo(tx).findOne({
      where: [{ productId: itemId }, { variantId: itemId }],
    });
    return row ? this.toDomain(row) : null;
  }

  async findByType(type: StockItemType, tx?: TransactionContext): Promise<StockItem[]> {
    const rows = await this.getRepo(tx).find({ where: { type } });
    return rows.map((r) => this.toDomain(r));
  }

  async create(stockItem: StockItem, tx?: TransactionContext): Promise<StockItem> {
    const repo = this.getRepo(tx);
    const row = repo.create({
      id: stockItem.stockItemId,
      type: stockItem.type,
      productId: stockItem.productId ?? null,
      variantId: stockItem.variantId ?? null,
      isActive: stockItem.isActive,
      createdAt: stockItem.createdAt,
    });
    const saved = await repo.save(row);
    return this.toDomain(saved);
  }

  async setActive(stockItemId: string, isActive: boolean, tx?: TransactionContext): Promise<void> {
    await this.getRepo(tx).update({ id: stockItemId }, { isActive });
  }
}
