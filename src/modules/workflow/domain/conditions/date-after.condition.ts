import { Condition, ConditionEvaluation, WorkflowContext } from "./condition";

export class DateAfterCondition implements Condition {
  constructor(private readonly threshold: Date) {}

  evaluate(context: WorkflowContext): ConditionEvaluation {
    return context.currentDate >= this.threshold
      ? { passed: true, type: "DATE_AFTER" }
      : { passed: false, type: "DATE_AFTER", reason: "La fecha actual aun no supera el umbral" };
  }
}
