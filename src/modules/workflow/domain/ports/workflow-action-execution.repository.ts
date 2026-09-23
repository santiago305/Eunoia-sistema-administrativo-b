import { TransactionContext } from 'src/shared/domain/ports/unit-of-work.port';
import { WorkflowActionExecution } from '../entities/workflow-action-execution';

export const WORKFLOW_ACTION_EXECUTION_REPOSITORY = Symbol('WORKFLOW_ACTION_EXECUTION_REPOSITORY');

export interface WorkflowActionExecutionRepository {
  findByIdempotencyKey(
    idempotencyKey: string,
    tx?: TransactionContext,
  ): Promise<WorkflowActionExecution | null>;
  save(execution: WorkflowActionExecution, tx: TransactionContext): Promise<void>;
}
