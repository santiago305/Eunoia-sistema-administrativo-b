import { WarehousesApplicationError } from "./warehouses-application.error";

export class LocationNotFoundError extends WarehousesApplicationError {
  readonly code = "WAREHOUSES_APPLICATION_NOT_FOUND";
  readonly identifier = "LOCATION_NOT_FOUND";

  constructor() {
    super("Ubicacion no encontrada");
  }
}
