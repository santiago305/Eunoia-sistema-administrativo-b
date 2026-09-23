import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { TransactionContext } from 'src/shared/domain/ports/unit-of-work.port';
import { TypeormTransactionContext } from 'src/shared/domain/ports/typeorm-transaction-context';
import { WorkflowActionExecution } from 'src/modules/workflow/domain/entities/workflow-action-execution';
import { WorkflowActionExecutionRepository } from 'src/modules/workflow/domain/ports/workflow-action-execution.repository';
import { WorkflowActionExecutionEntity } from '../entities/workflow-action-execution.entity';

@Injectable()
export class WorkflowActionExecutionTypeormRepository implements WorkflowActionExecutionRepository {
  constructor(
    @InjectRepository(WorkflowActionExecutionEntity)
    private readonly repo: Repository<WorkflowActionExecutionEntity>,
  ) {}

  private manager(tx?: TransactionContext): EntityManager {
    return tx && (tx as TypeormTransactionContext).manager
      ? (tx as TypeormTransactionContext).manager
      : this.repo.manager;
  }

  private toDomain(row: WorkflowActionExecutionEntity): WorkflowActionExecution {
    return new WorkflowActionExecution({
      id: row.id,
      saleOrderId: row.saleOrderId,
      transitionId: row.transitionId,
      actionId: row.actionId,
      actionType: row.actionType,
      idempotencyKey: row.idempotencyKey,
      status: row.status,
      attempts: row.attempts,
      evidence: row.evidence,
      error: row.error,
      startedAt: row.startedAt,
      completedAt: row.completedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  async findByIdempotencyKey(key: string, tx?: TransactionContext): Promise<WorkflowActionExecution | null> {
    const row = await this.manager(tx).getRepository(WorkflowActionExecutionEntity).findOne({
      where: { idempotencyKey: key },
    });
    return row ? this.toDomain(row) : null;
  }

  async save(execution: WorkflowActionExecution, tx: TransactionContext): Promise<void> {
    await this.manager(tx).getRepository(WorkflowActionExecutionEntity).save({
      id: execution.id,
      saleOrderId: execution.saleOrderId,
      transitionId: execution.transitionId,
      actionId: execution.actionId,
      actionType: execution.actionType,
      idempotencyKey: execution.idempotencyKey,
      status: execution.status,
      attempts: execution.attempts,
      evidence: execution.evidence,
      error: execution.error,
      startedAt: execution.startedAt,
      completedAt: execution.completedAt,
      createdAt: execution.createdAt,
      updatedAt: execution.updatedAt,
    });
  }
}
