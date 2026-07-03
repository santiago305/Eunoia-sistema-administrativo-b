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
      case ACTIONS.ASSIGN_WAREHOUSE_BY_PROVINCE:
        this.validateWarehouseAssignmentConfig(action.config);
        return;
      default:
        throw new Error("Accion de workflow no soportada");
    }
  }

  static validateOrder(actions: Array<Pick<WorkflowAction, "type" | "position">>): void {
    const stockPositions = actions
      .filter((action) =>
        [ACTIONS.RESERVE_STOCK, ACTIONS.CONSUME_STOCK, ACTIONS.REVERT_STOCK].includes(action.type as any),
      )
      .map((action) => action.position);
    if (!stockPositions.length) return;

    const firstStockPosition = Math.min(...stockPositions);
    const assignmentAfterStock = actions.some(
      (action) =>
        action.type === ACTIONS.ASSIGN_WAREHOUSE_BY_PROVINCE &&
        action.position >= firstStockPosition,
    );
    if (assignmentAfterStock) {
      throw new Error("La asignacion de almacen debe ejecutarse antes de las acciones de stock");
    }
  }

  private static validateWarehouseAssignmentConfig(config: Readonly<Record<string, unknown>>): void {
    const mode = config.mode;
    const provinceIds = config.provinceIds;
    const warehouseId = config.warehouseId;
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const validProvinceIds =
      Array.isArray(provinceIds) &&
      provinceIds.length > 0 &&
      provinceIds.every((id) => typeof id === "string" && /^\d{4}$/.test(id)) &&
      new Set(provinceIds).size === provinceIds.length;

    if (
      !["INCLUDE", "EXCLUDE"].includes(String(mode)) ||
      !validProvinceIds ||
      typeof warehouseId !== "string" ||
      !uuidPattern.test(warehouseId)
    ) {
      throw new Error("Configuracion de asignacion de almacen invalida");
    }
  }
}
