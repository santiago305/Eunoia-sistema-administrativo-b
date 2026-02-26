import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { SkuCounterRepository } from 'src/modules/catalog/domain/ports/sku-counter.repository';
import { SkuCounter } from 'src/modules/catalog/domain/entity/sku-counter';
import { SkuCounterEntity } from '../entities/sku-counter.entity';
import { TypeormTransactionContext } from 'src/modules/inventory/adapters/out/typeorm/uow/typeorm.transaction-context';
import { TransactionContext } from 'src/shared/domain/ports/transaction-context.port';

@Injectable()
export class SkuCounterTypeormRepository implements SkuCounterRepository {
  constructor(
    @InjectRepository(SkuCounterEntity)
    private readonly repo: Repository<SkuCounterEntity>,
  ) {}

  private getManager(tx?: TransactionContext): EntityManager {
    if (tx && (tx as TypeormTransactionContext).manager) {
      return (tx as TypeormTransactionContext).manager;
    }
    return this.repo.manager;
  }

  private getRepo(tx?: TransactionContext) {
    return this.getManager(tx).getRepository(SkuCounterEntity);
  }

  private toDomain(row: SkuCounterEntity): SkuCounter {
    return new SkuCounter(row.id, row.lastNumber);
  }

  async create(counter: SkuCounter, tx?: TransactionContext): Promise<void> {
    const repo = this.getRepo(tx);
    await repo.save({
      id: counter.id,
      lastNumber: counter.last_number,
    });
  }

  async update(counter: SkuCounter, tx?: TransactionContext): Promise<void> {
    const repo = this.getRepo(tx);
    await repo.update(
      { id: counter.id },
      { lastNumber: counter.last_number },
    );
  }

  async findLast(tx?: TransactionContext): Promise<SkuCounter | null> {
    const row = await this.getRepo(tx)
      .createQueryBuilder('c')
      .orderBy('c.updated_at', 'DESC')
      .limit(1)
      .getOne();

    return row ? this.toDomain(row) : null;
  }

  // OPCION PROFESIONAL: metodo extra recomendado
  async reserveNext(tx: TransactionContext): Promise<number> {
    const manager = (tx as TypeormTransactionContext).manager;
    const repo = manager.getRepository(SkuCounterEntity);

    const row = await repo.createQueryBuilder('c')
      .orderBy('c.updated_at', 'DESC')
      .limit(1)
      .getOne();

    if (!row) {
      const created = repo.create({ lastNumber: 1 });
      await repo.save(created);
      return 1;
    }

    row.lastNumber = row.lastNumber + 1;
    await repo.save(row);
    return row.lastNumber;
  }
}
