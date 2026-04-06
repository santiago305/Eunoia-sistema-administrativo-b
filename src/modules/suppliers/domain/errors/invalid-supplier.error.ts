import { SuppliersDomainError } from "./suppliers-domain.error";

export class InvalidSupplierError extends SuppliersDomainError {
  readonly code = "SUPPLIERS_DOMAIN_VALIDATION";
  readonly identifier = "SUPPLIER_INVALID";

  constructor(message = "El proveedor es invalido") {
    super(message);
  }
}
