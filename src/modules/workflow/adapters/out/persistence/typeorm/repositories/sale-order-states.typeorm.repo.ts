import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, Repository } from "typeorm";
import { TypeormTransactionContext } from "src/shared/domain/ports/typeorm-transaction-context";
import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { SaleOrdersStates } from "src/modules/workflow/domain/entities/sale-order-states";
import { SaleOrderStatesRepository } from "src/modules/workflow/domain/ports/sale-order-states.repository";
import { SaleOrderStatesEntity } from "../entities/sale-order-states.entity";

@Injectable()
export class SaleOrderStatesTypeormRepository implements SaleOrderStatesRepository {
  constructor(
    @InjectRepository(SaleOrderStatesEntity)
    private readonly repo: Repository<SaleOrderStatesEntity>,
  ) {}

  private getManager(tx?: TransactionContext): EntityManager {
    if (tx && (tx as TypeormTransactionContext).manager) {
      return (tx as TypeormTransactionContext).manager;
    }
    return this.repo.manager;
  }

  private getRepo(tx?: TransactionContext) {
    return this.getManager(tx).getRepository(SaleOrderStatesEntity);
  }

  private toDomain(row: SaleOrderStatesEntity): SaleOrdersStates {
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      color: row.color,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt ?? null,
    };
  }

  async create(state: SaleOrdersStates, tx?: TransactionContext): Promise<SaleOrdersStates> {
    const saved = await this.getRepo(tx).save({
      id: state.id ?? undefined,
      code: state.code,
      name: state.name,
      color: state.color,
    });
    return this.toDomain(saved);
  }

  async findById(saleOrderStateId: string, tx?: TransactionContext): Promise<SaleOrdersStates | null> {
    const row = await this.getRepo(tx).findOne({ where: { id: saleOrderStateId } });
    return row ? this.toDomain(row) : null;
  }

  async list(tx?: TransactionContext): Promise<SaleOrdersStates[]> {
    const rows = await this.getRepo(tx).find({ order: { name: "ASC" } });
    return rows.map((row) => this.toDomain(row));
  }

  async update(state: SaleOrdersStates, tx?: TransactionContext): Promise<SaleOrdersStates> {
    const repo = this.getRepo(tx);
    await repo.update({ id: state.id as string }, { name: state.name, color: state.color });
    const updated = await repo.findOneOrFail({ where: { id: state.id as string } });
    return this.toDomain(updated);
  }
}
