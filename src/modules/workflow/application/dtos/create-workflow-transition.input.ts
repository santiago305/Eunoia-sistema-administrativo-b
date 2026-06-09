import { WorkflowConditionType } from "../../domain/entities/workflow-condition";
import { WorkflowActionType } from "../../domain/entities/workflow-action";
import { WorkflowTransitionPurpose } from "../../domain/constants/workflow-transition-purpose.constants";
import { WorkflowTransitionEffect } from "../../domain/constants/workflow-transition-effect.constants";

export type CreateWorkflowTransitionInput = {
  workflowId: string;
  code: string;
  name: string;
  effect?: WorkflowTransitionEffect;
  purpose?: WorkflowTransitionPurpose;
  fromStateId?: string | null;
  toStateId?: string | null;
  isGlobal?: boolean;
  excludedStateIds?: string[];
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
