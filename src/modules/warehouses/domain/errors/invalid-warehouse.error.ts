import { WarehousesDomainError } from "./warehouses-domain.error";

export class InvalidWarehouseError extends WarehousesDomainError {
  readonly code = "WAREHOUSES_DOMAIN_VALIDATION";
  readonly identifier = "WAREHOUSE_INVALID";

  constructor(message = "El almacen es invalido") {
    super(message);
  }
}
