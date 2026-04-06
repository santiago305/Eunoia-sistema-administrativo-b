import { ProductionApplicationError } from "./production-application.error";

export class ProductionOrderItemNotFoundApplicationError extends ProductionApplicationError {
  readonly code = "PRODUCTION_APPLICATION_NOT_FOUND";
  readonly identifier = "PRODUCTION_ORDER_ITEM_NOT_FOUND";

  constructor() {
    super("Item no encontrado");
  }
}
