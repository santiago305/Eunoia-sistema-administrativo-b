import { WarehousesDomainError } from "./warehouses-domain.error";

export class InvalidLocationError extends WarehousesDomainError {
  readonly code = "WAREHOUSES_DOMAIN_VALIDATION";
  readonly identifier = "LOCATION_INVALID";

  constructor(message = "La ubicacion es invalida") {
    super(message);
  }
}
