import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { WorkflowState } from "../entities/workflow-state";

export const WORKFLOW_STATE_REPOSITORY = Symbol("WORKFLOW_STATE_REPOSITORY");

export interface WorkflowStateRepository {
  create(state: WorkflowState, tx?: TransactionContext): Promise<WorkflowState>;
  update(state: WorkflowState, tx?: TransactionContext): Promise<WorkflowState>;
  updatePositions(states: WorkflowState[], tx?: TransactionContext): Promise<WorkflowState[]>;
  findById(id: string, tx?: TransactionContext): Promise<WorkflowState | null>;
  findInitialByWorkflowId(workflowId: string, tx?: TransactionContext): Promise<WorkflowState | null>;
  listByWorkflowId(workflowId: string, tx?: TransactionContext): Promise<WorkflowState[]>;
}
