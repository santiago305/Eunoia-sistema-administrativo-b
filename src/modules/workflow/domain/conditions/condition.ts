import { WorkflowConditionType } from "../entities/workflow-condition";

export type WorkflowContext = {
  orderId: string;
  isPaid: boolean;
  hasStock: boolean;
  isCancelled: boolean;
  invoiceSent: boolean;
  currentDate: Date;
  variables: Readonly<Record<string, unknown>>;
};

export type ConditionEvaluation = {
  passed: boolean;
  type: WorkflowConditionType;
  reason?: string;
  details?: Record<string, unknown>;
};

export interface Condition {
  evaluate(context: WorkflowContext): ConditionEvaluation;
}
