import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { StockItemVariant } from 'src/modules/inventory/domain/entities/stock-item/stock-item-variant';
import { StockItemVariantRepository } from 'src/modules/inventory/domain/ports/stock-item/stock-item-variant.repository.port';
import { TransactionContext } from 'src/shared/domain/ports/transaction-context.port';
import { TypeormTransactionContext } from 'src/shared/domain/ports/typeorm-transaction-context';
import { EntityManager, Repository } from 'typeorm';
import { StockItemVariantEntity } from '../../entities/stock-item/stock-item-variant.entity';


@Injectable()
export class StockItemVariantTypeormRepository implements StockItemVariantRepository {
  constructor(
    @InjectRepository(StockItemVariantEntity)
    private readonly repo: Repository<StockItemVariantEntity>,
  ) {}

  private getManager(tx?: TransactionContext): EntityManager {
    if (tx && (tx as TypeormTransactionContext).manager) {
      return (tx as TypeormTransactionContext).manager;
    }
    return this.repo.manager;
  }

  private getRepo(tx?: TransactionContext) {
    return this.getManager(tx).getRepository(StockItemVariantEntity);
  }

  private toDomain(row: StockItemVariantEntity): StockItemVariant {
    return new StockItemVariant(row.stockItemId, row.variantId);
  }

  async findByStockItemId(stockItemId: string, tx?: TransactionContext): Promise<StockItemVariant | null> {
    const row = await this.getRepo(tx).findOne({ where: { stockItemId } });
    return row ? this.toDomain(row) : null;
  }

  async findByVariantId(variantId: string, tx?: TransactionContext): Promise<StockItemVariant | null> {
    const row = await this.getRepo(tx).findOne({ where: { variantId } });
    return row ? this.toDomain(row) : null;
  }

  async create(link: StockItemVariant, tx?: TransactionContext): Promise<StockItemVariant> {
    const repo = this.getRepo(tx);
    const row = repo.create({ stockItemId: link.stockItemId, variantId: link.variantId });
    const saved = await repo.save(row);
    return this.toDomain(saved);
  }
}
