import { WorkflowActionOutcome } from "../services/sale-order-warehouse-assignment.service";

export type WorkflowStateReference = {
  workflowStateId: string;
  saleOrderStateId: string;
  code: string;
  name: string;
};

export type CompletedWorkflowTransition = {
  transitionId: string;
  code: string;
  name: string;
  fromState: WorkflowStateReference;
  toState: WorkflowStateReference;
  warnings: string[];
  actionOutcomes: WorkflowActionOutcome[];
};

export type SaleOrderWorkflowRouteFailure = {
  code:
    | "SALE_ORDER_NOT_FOUND"
    | "WORKFLOW_NOT_ASSIGNED"
    | "WORKFLOW_NOT_FOUND"
    | "WORKFLOW_INACTIVE"
    | "CURRENT_STATE_INVALID"
    | "CURRENT_STATE_INACTIVE"
    | "TARGET_STATE_NOT_IN_WORKFLOW"
    | "TARGET_STATE_INACTIVE"
    | "ROUTE_NOT_FOUND"
    | "AMBIGUOUS_ROUTE"
    | "CONDITION_FAILED"
    | "ACTION_FAILED"
    | "ROUTE_INVALIDATED"
    | "UNEXPECTED_ERROR";
  message: string;
  details?: Record<string, unknown>;
};

type SaleOrderWorkflowRouteBase = {
  saleOrderId: string;
  targetStateId: string;
  initialState: WorkflowStateReference | null;
  finalState: WorkflowStateReference | null;
  completedTransitions: CompletedWorkflowTransition[];
  warnings: string[];
};

export type SaleOrderWorkflowRouteResult =
  | (SaleOrderWorkflowRouteBase & {
      status: "success";
    })
  | (SaleOrderWorkflowRouteBase & {
      status: "failed";
      message: string;
      failure: SaleOrderWorkflowRouteFailure;
    });
