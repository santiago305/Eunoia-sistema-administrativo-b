import { CONDITIONS } from "../constants/workflow-condition.constants";
import { Condition, ConditionEvaluation, WorkflowContext } from "./condition";
import { getSaleOrderFieldOption, isPresentSaleOrderFieldValue, SaleOrderFieldValue } from "./sale-order-field-options";

export class SaleOrderFieldRequiredCondition implements Condition {
  constructor(private readonly field: SaleOrderFieldValue) {}

  evaluate(context: WorkflowContext): ConditionEvaluation {
    const currentValue = context.variables[this.field];
    const passed = isPresentSaleOrderFieldValue(currentValue);
    const option = getSaleOrderFieldOption(this.field);

    return passed
      ? { passed: true, type: CONDITIONS.SALE_ORDER_FIELD_REQUIRED }
      : {
          passed: false,
          type: CONDITIONS.SALE_ORDER_FIELD_REQUIRED,
          reason: option?.reason ?? "El campo requerido del pedido no esta completo",
          details: {
            field: this.field,
            label: option?.label ?? this.field,
            missing: true,
            currentValue,
          },
        };
  }
}
