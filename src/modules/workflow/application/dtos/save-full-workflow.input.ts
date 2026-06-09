import { WorkflowConditionType } from "../../domain/entities/workflow-condition";
import { WorkflowActionType } from "../../domain/entities/workflow-action";
import { WorkflowTransitionPurpose } from "../../domain/constants/workflow-transition-purpose.constants";
import { WorkflowTransitionEffect } from "../../domain/constants/workflow-transition-effect.constants";

export type FullWorkflowStateInput = {
  id?: string;
  clientId: string;
  saleOrderStateId?: string;
  /** @deprecated Workflow state display data comes from sale_order_states. */
  code?: string;
  /** @deprecated Workflow state display data comes from sale_order_states. */
  name?: string;
  /** @deprecated Workflow state display data comes from sale_order_states. */
  color?: string;
  position?: number;
  positionX?: number | null;
  positionY?: number | null;
  isInitial?: boolean;
  isFinal?: boolean;
  isActive?: boolean;
};

export type FullWorkflowTransitionInput = {
  id?: string;
  clientId: string;
  code: string;
  name: string;
  effect?: WorkflowTransitionEffect;
  purpose?: WorkflowTransitionPurpose;
  fromStateRef?: string | null;
  toStateRef?: string | null;
  isGlobal?: boolean;
  excludedStateRefs?: string[];
  sourceHandle?: string | null;
  targetHandle?: string | null;
  isActive?: boolean;
  conditions?: Array<{
    type: WorkflowConditionType;
    config?: Record<string, unknown>;
    position?: number;
  }>;
  actions?: Array<{
    type: WorkflowActionType;
    config?: Record<string, unknown>;
    position?: number;
  }>;
};

export type SaveFullWorkflowInput = {
  workflowId?: string;
  name: string;
  description?: string | null;
  isActive?: boolean;
  states: FullWorkflowStateInput[];
  transitions: FullWorkflowTransitionInput[];
};
