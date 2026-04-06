import { SuppliersDomainError } from "./suppliers-domain.error";

export class InvalidSupplierVariantError extends SuppliersDomainError {
  readonly code = "SUPPLIERS_DOMAIN_VALIDATION";
  readonly identifier = "SUPPLIER_VARIANT_INVALID";

  constructor(message = "La relacion proveedor-variante es invalida") {
    super(message);
  }
}
