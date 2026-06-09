export type SaleOrderStateHistoryProps = {
  id: string;
  saleOrderId: string;
  workflowId: string;
  transitionId: string | null;
  fromStateId: string | null;
  toStateId: string;
  executedBy: string;
  executedAt: Date;
  metadata: Readonly<Record<string, unknown>> | null;
};

export class SaleOrderStateHistory {
  readonly id: string;
  readonly saleOrderId: string;
  readonly workflowId: string;
  readonly transitionId: string | null;
  readonly fromStateId: string | null;
  readonly toStateId: string;
  readonly executedBy: string;
  readonly executedAt: Date;
  readonly metadata: Readonly<Record<string, unknown>> | null;

  constructor(props: SaleOrderStateHistoryProps) {
    this.id = props.id;
    this.saleOrderId = props.saleOrderId;
    this.workflowId = props.workflowId;
    this.transitionId = props.transitionId;
    this.fromStateId = props.fromStateId;
    this.toStateId = props.toStateId;
    this.executedBy = props.executedBy;
    this.executedAt = props.executedAt;
    this.metadata = props.metadata;
  }
}
