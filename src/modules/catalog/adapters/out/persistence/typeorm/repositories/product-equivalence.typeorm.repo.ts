import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductEquivalenceRepository } from 'src/modules/catalog/domain/ports/product-equivalence.repository';
import { ProductEquivalence } from 'src/modules/catalog/domain/entity/product-equivalence';
import { ProductEquivalenceEntity } from '../entities/product-equivalence.entity';
import { TransactionContext } from 'src/modules/inventory/domain/ports/unit-of-work.port';
import { TypeormTransactionContext } from 'src/modules/inventory/adapters/out/typeorm/uow/typeorm.transaction-context';

@Injectable()
export class ProductEquivalenceTypeormRepository implements ProductEquivalenceRepository {
  constructor(
    @InjectRepository(ProductEquivalenceEntity)
    private readonly repo: Repository<ProductEquivalenceEntity>,
  ) {}

  private getManager(tx?: TransactionContext) {
    if (tx && (tx as TypeormTransactionContext).manager) {
      return (tx as TypeormTransactionContext).manager;
    }
    return this.repo.manager;
  }

  private getRepo(tx?: TransactionContext) {
    return this.getManager(tx).getRepository(ProductEquivalenceEntity);
  }

  async create(equivalence: ProductEquivalence, tx?: TransactionContext): Promise<ProductEquivalence> {
    const repo = this.getRepo(tx);
    const saved = await repo.save({
      productId: equivalence.productId,
      fromUnitId: equivalence.fromUnitId,
      toUnitId: equivalence.toUnitId,
      factor: equivalence.factor,
    });
    return this.toDomain(saved);
  }

  async listByProductId(productId: string, tx?: TransactionContext): Promise<ProductEquivalence[]> {
    const rows = await this.getRepo(tx).find({ where: { productId } });
    return rows.map((row) => this.toDomain(row));
  }

  async findById(id: string, tx?: TransactionContext): Promise<ProductEquivalence | null> {
    const row = await this.getRepo(tx).findOne({ where: { id } });
    if (!row) return null;
    return this.toDomain(row);
  }

  async deleteById(id: string, tx?: TransactionContext): Promise<void> {
    await this.getRepo(tx).delete({ id });
  }

  private toDomain(row: ProductEquivalenceEntity): ProductEquivalence {
    return new ProductEquivalence(
      row.id,
      row.productId,
      row.fromUnitId,
      row.toUnitId,
      Number(row.factor),
    );
  }
}
