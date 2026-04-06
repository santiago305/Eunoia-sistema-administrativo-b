import { ProductionApplicationError } from "./production-application.error";

export class ProductionOrderNotFoundApplicationError extends ProductionApplicationError {
  readonly code = "PRODUCTION_APPLICATION_NOT_FOUND";
  readonly identifier = "PRODUCTION_ORDER_NOT_FOUND";

  constructor() {
    super("Orden de produccion no encontrada");
  }
}
