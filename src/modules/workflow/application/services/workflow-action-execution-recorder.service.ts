import { Inject, Injectable } from '@nestjs/common';
import { WorkflowActionExecution } from '../../domain/entities/workflow-action-execution';
import {
  WORKFLOW_ACTION_EXECUTION_REPOSITORY,
  WorkflowActionExecutionRepository,
} from '../../domain/ports/workflow-action-execution.repository';
import { TransactionContext } from 'src/shared/domain/ports/unit-of-work.port';

@Injectable()
export class WorkflowActionExecutionRecorderService {
  constructor(
    @Inject(WORKFLOW_ACTION_EXECUTION_REPOSITORY)
    private readonly repository: WorkflowActionExecutionRepository,
  ) {}

  async start(input: {
    saleOrderId: string;
    transitionId?: string | null;
    actionId?: string | null;
    actionType: string;
    idempotencyKey: string;
    now: Date;
    tx: TransactionContext;
  }): Promise<WorkflowActionExecution> {
    const existing = await this.repository.findByIdempotencyKey(input.idempotencyKey, input.tx);
    if (existing) return existing;
    const execution = new WorkflowActionExecution({
      id: crypto.randomUUID(),
      saleOrderId: input.saleOrderId,
      transitionId: input.transitionId,
      actionId: input.actionId,
      actionType: input.actionType,
      idempotencyKey: input.idempotencyKey,
      status: 'STARTED',
      attempts: 1,
      startedAt: input.now,
      completedAt: null,
      createdAt: input.now,
      updatedAt: input.now,
    });
    await this.repository.save(execution, input.tx);
    return execution;
  }

  async finish(input: {
    idempotencyKey: string;
    status: 'COMPLETED' | 'FAILED' | 'SKIPPED';
    evidence?: Record<string, unknown>;
    error?: Record<string, unknown>;
    now: Date;
    tx: TransactionContext;
  }): Promise<WorkflowActionExecution | null> {
    const existing = await this.repository.findByIdempotencyKey(input.idempotencyKey, input.tx);
    if (!existing) return null;
    const finished = new WorkflowActionExecution({
      ...existing,
      status: input.status,
      attempts: existing.attempts + 1,
      evidence: input.evidence ?? existing.evidence,
      error: input.error ?? existing.error,
      completedAt: input.now,
      updatedAt: input.now,
    });
    await this.repository.save(finished, input.tx);
    return finished;
  }

  async record(input: {
    saleOrderId: string;
    transitionId?: string | null;
    actionId?: string | null;
    actionType: string;
    idempotencyKey: string;
    status: 'COMPLETED' | 'FAILED' | 'SKIPPED';
    evidence?: Record<string, unknown>;
    error?: Record<string, unknown>;
    now: Date;
    tx: TransactionContext;
  }): Promise<WorkflowActionExecution> {
    const existing = await this.repository.findByIdempotencyKey(input.idempotencyKey, input.tx);
    if (existing) return existing;

    const execution = new WorkflowActionExecution({
      id: crypto.randomUUID(),
      saleOrderId: input.saleOrderId,
      transitionId: input.transitionId,
      actionId: input.actionId,
      actionType: input.actionType,
      idempotencyKey: input.idempotencyKey,
      status: input.status,
      attempts: 1,
      evidence: input.evidence,
      error: input.error,
      startedAt: input.now,
      completedAt: input.now,
      createdAt: input.now,
      updatedAt: input.now,
    });
    await this.repository.save(execution, input.tx);
    return execution;
  }
}
