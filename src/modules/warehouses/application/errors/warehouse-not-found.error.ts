import { WarehousesApplicationError } from "./warehouses-application.error";

export class WarehouseNotFoundError extends WarehousesApplicationError {
  readonly code = "WAREHOUSES_APPLICATION_NOT_FOUND";
  readonly identifier = "WAREHOUSE_NOT_FOUND";

  constructor() {
    super("Almacen no encontrado");
  }
}
