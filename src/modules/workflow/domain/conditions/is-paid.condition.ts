import { Condition, ConditionEvaluation, WorkflowContext } from "./condition";

export class IsPaidCondition implements Condition {
  evaluate(context: WorkflowContext): ConditionEvaluation {
    return context.isPaid
      ? { passed: true, type: "IS_PAID" }
      : { passed: false, type: "IS_PAID", reason: "El pedido no esta pagado" };
  }
}

export class IsNotPaidCondition implements Condition {
  evaluate(context: WorkflowContext): ConditionEvaluation {
    return !context.isPaid
      ? { passed: true, type: "IS_NOT_PAID" }
      : { passed: false, type: "IS_NOT_PAID", reason: "El pedido ya esta pagado" };
  }
}
