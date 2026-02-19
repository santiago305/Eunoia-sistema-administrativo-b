import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UnitRepository } from 'src/modules/catalog/domain/ports/unit.repository';
import { Unit } from 'src/modules/catalog/domain/entity/unit';
import { UnitEntity } from '../entities/unit.entity';
import { TransactionContext } from 'src/shared/domain/ports/transaction-context.port';
import { TypeormTransactionContext } from 'src/modules/inventory/adapters/out/typeorm/uow/typeorm.transaction-context';

@Injectable()
export class UnitTypeormRepository implements UnitRepository {
  constructor(
    @InjectRepository(UnitEntity)
    private readonly repo: Repository<UnitEntity>,
  ) {}

  private getManager(tx?: TransactionContext) {
    if (tx && (tx as TypeormTransactionContext).manager) {
      return (tx as TypeormTransactionContext).manager;
    }
    return this.repo.manager;
  }

  private getRepo(tx?: TransactionContext) {
    return this.getManager(tx).getRepository(UnitEntity);
  }

  async list(tx?: TransactionContext): Promise<Unit[]> {
    const rows = await this.getRepo(tx).find();
    return rows.map((row) => this.toDomain(row));
  }

  private toDomain(row: UnitEntity): Unit {
    return new Unit(row.id, row.code, row.name);
  }
}
