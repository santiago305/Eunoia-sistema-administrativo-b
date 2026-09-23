export type WorkflowActionExecutionStatus =
  | 'STARTED'
  | 'COMPLETED'
  | 'FAILED'
  | 'SKIPPED';

export type WorkflowActionExecutionProps = {
  id: string;
  saleOrderId: string;
  transitionId?: string | null;
  actionId?: string | null;
  actionType: string;
  idempotencyKey: string;
  status: WorkflowActionExecutionStatus;
  attempts: number;
  evidence?: Record<string, unknown> | null;
  error?: Record<string, unknown> | null;
  startedAt: Date;
  completedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export class WorkflowActionExecution {
  readonly id: string;
  readonly saleOrderId: string;
  readonly transitionId: string | null;
  readonly actionId: string | null;
  readonly actionType: string;
  readonly idempotencyKey: string;
  readonly status: WorkflowActionExecutionStatus;
  readonly attempts: number;
  readonly evidence: Record<string, unknown> | null;
  readonly error: Record<string, unknown> | null;
  readonly startedAt: Date;
  readonly completedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: WorkflowActionExecutionProps) {
    Object.assign(this, props);
    this.transitionId = props.transitionId ?? null;
    this.actionId = props.actionId ?? null;
    this.evidence = props.evidence ?? null;
    this.error = props.error ?? null;
    this.completedAt = props.completedAt ?? null;
  }
}
