import {
  TRANSITION_PURPOSES,
  WorkflowTransitionPurpose,
} from "../constants/workflow-transition-purpose.constants";
import {
  TRANSITION_EFFECTS,
  WorkflowTransitionEffect,
} from "../constants/workflow-transition-effect.constants";

export type WorkflowTransitionProps = {
  id: string;
  workflowId: string;
  code: string;
  name: string;
  effect?: WorkflowTransitionEffect;
  purpose?: WorkflowTransitionPurpose;
  fromStateId: string | null;
  toStateId: string | null;
  isGlobal?: boolean;
  excludedStateIds?: string[];
  sourceHandle?: string | null;
  targetHandle?: string | null;
  isActive: boolean;
};

export class WorkflowTransition {
  readonly id: string;
  readonly workflowId: string;
  readonly code: string;
  readonly name: string;
  readonly effect: WorkflowTransitionEffect;
  readonly purpose: WorkflowTransitionPurpose;
  readonly fromStateId: string | null;
  readonly toStateId: string | null;
  readonly isGlobal: boolean;
  readonly excludedStateIds: string[];
  readonly sourceHandle: string | null;
  readonly targetHandle: string | null;
  readonly isActive: boolean;

  constructor(props: WorkflowTransitionProps) {
    this.id = props.id;
    this.workflowId = props.workflowId;
    this.code = props.code.trim();
    this.name = props.name.trim();
    this.effect = props.effect ?? TRANSITION_EFFECTS.MOVE_STATE;
    this.purpose = props.purpose ?? TRANSITION_PURPOSES.STANDARD;
    this.fromStateId = props.fromStateId;
    this.toStateId = props.toStateId;
    this.isGlobal = props.isGlobal ?? false;
    this.excludedStateIds = [...(props.excludedStateIds ?? [])];
    this.sourceHandle = props.sourceHandle ?? null;
    this.targetHandle = props.targetHandle ?? null;
    this.isActive = props.isActive;
  }
}
