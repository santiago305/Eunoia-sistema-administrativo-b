import { Condition, ConditionEvaluation, WorkflowContext } from "./condition";

export class NotCancelledCondition implements Condition {
  evaluate(context: WorkflowContext): ConditionEvaluation {
    return !context.isCancelled
      ? { passed: true, type: "NOT_CANCELLED" }
      : { passed: false, type: "NOT_CANCELLED", reason: "El pedido ya fue cancelado" };
  }
}
