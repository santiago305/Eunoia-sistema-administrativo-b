import { SaleOrder } from 'src/modules/sale-orders/domain/entities/sale-order';
import { TransactionContext } from 'src/shared/domain/ports/unit-of-work.port';
import { WorkflowAction } from '../../../domain/entities/workflow-action';
import { WorkflowActionType } from '../../../domain/constants/workflow-action.constants';
import { WorkflowActionOutcome } from '../sale-order-warehouse-assignment.service';

export type WorkflowActionDecision =
  | { status: 'PENDING' }
  | { status: 'ALREADY_SATISFIED'; evidence: Record<string, unknown> }
  | { status: 'CONFLICT'; reason: string };

export type WorkflowActionMutableState = {
  invoiceSent: boolean;
  preguide: boolean;
  prepared: boolean;
};

export type WorkflowActionContext = {
  order: SaleOrder;
  action: WorkflowAction;
  tx: TransactionContext;
  executedBy?: string;
  currentConditions: unknown[];
  state: WorkflowActionMutableState;
};

export type WorkflowActionExecutionResult = {
  outcome: WorkflowActionOutcome;
  order?: SaleOrder;
};

export interface IdempotentWorkflowActionHandler {
  supports(type: WorkflowActionType): boolean;
  inspect(context: WorkflowActionContext): Promise<WorkflowActionDecision>;
  execute(context: WorkflowActionContext): Promise<WorkflowActionExecutionResult>;
}
