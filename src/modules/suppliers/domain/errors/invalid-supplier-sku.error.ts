import { SuppliersDomainError } from "./suppliers-domain.error";

export class InvalidSupplierSkuError extends SuppliersDomainError {
  readonly code = "INVALID_SUPPLIER_SKU";
  readonly identifier = "supplier_sku";

  constructor(message: string = "El proveedor-sku es invalido") {
    super(message);
  }
}
