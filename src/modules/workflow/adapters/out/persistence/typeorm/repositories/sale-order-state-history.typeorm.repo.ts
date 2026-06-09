import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, Repository } from "typeorm";
import { SaleOrderStateHistory } from "src/modules/workflow/domain/entities/sale-order-state-history";
import { SaleOrderStateHistoryRepository } from "src/modules/workflow/domain/ports/sale-order-state-history.repository";
import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { TypeormTransactionContext } from "src/shared/domain/ports/typeorm-transaction-context";
import { SaleOrderStateHistoryEntity } from "../entities/sale-order-state-history.entity";

@Injectable()
export class SaleOrderStateHistoryTypeormRepository implements SaleOrderStateHistoryRepository {
  constructor(
    @InjectRepository(SaleOrderStateHistoryEntity)
    private readonly repo: Repository<SaleOrderStateHistoryEntity>,
  ) {}

  private getManager(tx?: TransactionContext): EntityManager {
    if (tx && (tx as TypeormTransactionContext).manager) {
      return (tx as TypeormTransactionContext).manager;
    }

    return this.repo.manager;
  }

  private toDomain(row: SaleOrderStateHistoryEntity) {
    return new SaleOrderStateHistory({
      id: row.id,
      saleOrderId: row.saleOrderId,
      workflowId: row.workflowId,
      transitionId: row.transitionId ?? null,
      fromStateId: row.fromStateId ?? null,
      toStateId: row.toStateId,
      executedBy: row.executedBy,
      executedAt: row.executedAt,
      metadata: row.metadata ?? null,
    });
  }

  async append(history: SaleOrderStateHistory, tx: TransactionContext): Promise<void> {
    const manager = this.getManager(tx);
    await manager.getRepository(SaleOrderStateHistoryEntity).save({
      id: history.id,
      saleOrderId: history.saleOrderId,
      workflowId: history.workflowId,
      transitionId: history.transitionId,
      fromStateId: history.fromStateId,
      toStateId: history.toStateId,
      executedBy: history.executedBy,
      executedAt: history.executedAt,
      metadata: history.metadata,
    });
  }

  async listBySaleOrderId(saleOrderId: string, tx?: TransactionContext): Promise<SaleOrderStateHistory[]> {
    const manager = this.getManager(tx);
    const rows = await manager.getRepository(SaleOrderStateHistoryEntity).find({
      where: { saleOrderId },
      order: { executedAt: "ASC" },
    });
    return rows.map((row) => this.toDomain(row));
  }
}
