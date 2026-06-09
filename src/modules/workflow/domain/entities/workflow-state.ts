export type WorkflowStateProps = {
  id: string;
  workflowId: string;
  saleOrderStateId?: string;
  code: string;
  name: string;
  color: string;
  position: number;
  positionX?: number | null;
  positionY?: number | null;
  isInitial: boolean;
  isFinal: boolean;
  isActive: boolean;
};

export class WorkflowState {
  readonly id: string;
  readonly workflowId: string;
  readonly saleOrderStateId: string;
  readonly code: string;
  readonly name: string;
  readonly color: string;
  readonly position: number;
  readonly positionX: number | null;
  readonly positionY: number | null;
  readonly isInitial: boolean;
  readonly isFinal: boolean;
  readonly isActive: boolean;

  constructor(props: WorkflowStateProps) {
    this.id = props.id;
    this.workflowId = props.workflowId;
    this.saleOrderStateId = props.saleOrderStateId ?? props.id;
    this.code = props.code.trim();
    this.name = props.name.trim();
    this.color = props.color.trim();
    this.position = props.position;
    this.positionX = props.positionX ?? null;
    this.positionY = props.positionY ?? null;
    this.isInitial = props.isInitial;
    this.isFinal = props.isFinal;
    this.isActive = props.isActive;
  }
}
