import { Condition, ConditionEvaluation, WorkflowContext } from "./condition";

export class HasStockCondition implements Condition {
  evaluate(context: WorkflowContext): ConditionEvaluation {
    return context.hasStock
      ? { passed: true, type: "HAS_STOCK" }
      : { passed: false, type: "HAS_STOCK", reason: "El pedido no tiene stock suficiente" };
  }
}
