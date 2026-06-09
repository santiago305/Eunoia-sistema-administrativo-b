import { Condition, ConditionEvaluation, WorkflowContext } from "./condition";

export class DateBeforeCondition implements Condition {
  constructor(private readonly threshold: Date) {}

  evaluate(context: WorkflowContext): ConditionEvaluation {
    return context.currentDate <= this.threshold
      ? { passed: true, type: "DATE_BEFORE" }
      : { passed: false, type: "DATE_BEFORE", reason: "La fecha actual ya supero el umbral" };
  }
}
