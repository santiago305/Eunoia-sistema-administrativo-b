export { WorkflowActionType } from "../constants/workflow-action.constants";
import { WorkflowActionType } from "../constants/workflow-action.constants";

export type WorkflowActionProps = {
  id: string;
  transitionId: string;
  type: WorkflowActionType;
  config: Readonly<Record<string, unknown>>;
  position: number;
  branch?: "THEN" | "ELSE";
};

export class WorkflowAction {
  readonly id: string;
  readonly transitionId: string;
  readonly type: WorkflowActionType;
  readonly config: Readonly<Record<string, unknown>>;
  readonly position: number;
  readonly branch: "THEN" | "ELSE";

  constructor(props: WorkflowActionProps) {
    this.id = props.id;
    this.transitionId = props.transitionId;
    this.type = props.type;
    this.config = props.config;
    this.position = props.position;
    this.branch = props.branch ?? "THEN";
  }
}
