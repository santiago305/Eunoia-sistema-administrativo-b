import { CONDITIONS } from "../constants/workflow-condition.constants";
import { Condition, ConditionEvaluation, WorkflowContext } from "./condition";

export class InvoiceSentCondition implements Condition {
  evaluate(context: WorkflowContext): ConditionEvaluation {
    return context.invoiceSent
      ? { passed: true, type: CONDITIONS.INVOICE_SENT }
      : {
          passed: false,
          type: CONDITIONS.INVOICE_SENT,
          reason: "El comprobante no ha sido enviado",
        };
  }
}
