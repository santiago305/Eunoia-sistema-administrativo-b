import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { StockItemProductEntity } from '../../entities/stock-item/stock-item-product.entity';
import { StockItemProductRepository } from 'src/modules/inventory/domain/ports/stock-item/stock-item-product.repository.port';
import { TransactionContext } from 'src/shared/domain/ports/transaction-context.port';
import { TypeormTransactionContext } from 'src/shared/domain/ports/typeorm-transaction-context';
import { StockItemProduct } from 'src/modules/inventory/domain/entities/stock-item/stock-item-product';


@Injectable()
export class StockItemProductTypeormRepository implements StockItemProductRepository {
  constructor(
    @InjectRepository(StockItemProductEntity)
    private readonly repo: Repository<StockItemProductEntity>,
  ) {}

  private getManager(tx?: TransactionContext): EntityManager {
    if (tx && (tx as TypeormTransactionContext).manager) {
      return (tx as TypeormTransactionContext).manager;
    }
    return this.repo.manager;
  }

  private getRepo(tx?: TransactionContext) {
    return this.getManager(tx).getRepository(StockItemProductEntity);
  }

  private toDomain(row: StockItemProductEntity): StockItemProduct {
    return new StockItemProduct(row.stockItemId, row.productId);
  }

  async findByStockItemId(stockItemId: string, tx?: TransactionContext): Promise<StockItemProduct | null> {
    const row = await this.getRepo(tx).findOne({ where: { stockItemId } });
    return row ? this.toDomain(row) : null;
  }

  async findByProductId(productId: string, tx?: TransactionContext): Promise<StockItemProduct | null> {
    const row = await this.getRepo(tx).findOne({ where: { productId } });
    return row ? this.toDomain(row) : null;
  }

  async create(link: StockItemProduct, tx?: TransactionContext): Promise<StockItemProduct> {
    const repo = this.getRepo(tx);
    const row = repo.create({ stockItemId: link.stockItemId, productId: link.productId });
    const saved = await repo.save(row);
    return this.toDomain(saved);
  }
}
