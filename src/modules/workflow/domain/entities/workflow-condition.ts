export { WorkflowConditionType } from "../constants/workflow-condition.constants";
import { WorkflowConditionType } from "../constants/workflow-condition.constants";

export type WorkflowConditionProps = {
  id: string;
  transitionId: string;
  type: WorkflowConditionType;
  config: Readonly<Record<string, unknown>>;
  position: number;
};

export class WorkflowCondition {
  readonly id: string;
  readonly transitionId: string;
  readonly type: WorkflowConditionType;
  readonly config: Readonly<Record<string, unknown>>;
  readonly position: number;

  constructor(props: WorkflowConditionProps) {
    this.id = props.id;
    this.transitionId = props.transitionId;
    this.type = props.type;
    this.config = props.config;
    this.position = props.position;
  }
}
