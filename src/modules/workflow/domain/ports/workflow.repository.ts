import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { Workflow } from "../entities/workflow";
import { WorkflowState } from "../entities/workflow-state";
import { WorkflowTransition } from "../entities/workflow-transition";
import { WorkflowCondition } from "../entities/workflow-condition";
import { WorkflowAction } from "../entities/workflow-action";

export const WORKFLOW_REPOSITORY = Symbol("WORKFLOW_REPOSITORY");

export type WorkflowAggregate = {
  workflow: Workflow;
  states: WorkflowState[];
  transitions: WorkflowTransition[];
  conditions: WorkflowCondition[];
  actions: WorkflowAction[];
};

export type WorkflowWithInitialState = {
  workflow: Workflow;
  initialState: WorkflowState;
};

export interface WorkflowRepository {
  create(workflow: Workflow, tx?: TransactionContext): Promise<Workflow>;
  update(workflow: Workflow, tx?: TransactionContext): Promise<Workflow>;
  findById(id: string, tx?: TransactionContext): Promise<Workflow | null>;
  findDetailedById(id: string, tx?: TransactionContext): Promise<WorkflowAggregate | null>;
  findActiveByNormalizedName(
    normalizedName: string,
    tx?: TransactionContext,
  ): Promise<WorkflowWithInitialState | null>;
  list(tx?: TransactionContext): Promise<Workflow[]>;
  saveFull(
    aggregate: WorkflowAggregate,
    options: { synchronize: boolean },
    tx: TransactionContext,
  ): Promise<WorkflowAggregate>;
}
