import { WorkflowAction } from "../entities/workflow-action";
import { ACTIONS } from "../constants/workflow-action.constants";

export class ActionFactory {
  static validate(action: Pick<WorkflowAction, "type" | "config">): void {
    switch (action.type) {
      case ACTIONS.RESERVE_STOCK:
      case ACTIONS.CONSUME_STOCK:
      case ACTIONS.REVERT_STOCK:
      case ACTIONS.MARK_INVOICE_SENT:
        return;
      default:
        throw new Error("Accion de workflow no soportada");
    }
  }
}
