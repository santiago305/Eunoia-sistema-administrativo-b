import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { UnitOfWork, TransactionContext } from '../../../../domain/ports/unit-of-work.port';
import { TypeormTransactionContext } from './typeorm.transaction-context';

@Injectable()
export class TypeormUnitOfWork implements UnitOfWork {
  constructor(private readonly dataSource: DataSource) {}

  async runInTransaction<T>(work: (tx: TransactionContext) => Promise<T>): Promise<T> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    const tx = new TypeormTransactionContext(queryRunner.manager);

    try {
      const result = await work(tx);
      await queryRunner.commitTransaction();
      return result;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
