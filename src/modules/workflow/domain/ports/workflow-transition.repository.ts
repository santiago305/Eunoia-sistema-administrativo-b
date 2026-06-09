import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { WorkflowCondition } from "../entities/workflow-condition";
import { WorkflowTransition } from "../entities/workflow-transition";
import { WorkflowAction } from "../entities/workflow-action";

export const WORKFLOW_TRANSITION_REPOSITORY = Symbol("WORKFLOW_TRANSITION_REPOSITORY");

export type WorkflowTransitionWithConditions = {
  transition: WorkflowTransition;
  conditions: WorkflowCondition[];
  actions: WorkflowAction[];
};

export interface WorkflowTransitionRepository {
  create(
    transition: WorkflowTransition,
    conditions: WorkflowCondition[],
    actions: WorkflowAction[],
    tx?: TransactionContext,
  ): Promise<WorkflowTransition>;
  findDetailedById(id: string, tx?: TransactionContext): Promise<WorkflowTransitionWithConditions | null>;
  listFromState(
    workflowId: string,
    fromStateId: string,
    tx?: TransactionContext,
  ): Promise<WorkflowTransitionWithConditions[]>;
}
