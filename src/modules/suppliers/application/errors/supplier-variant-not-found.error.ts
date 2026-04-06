import { SuppliersApplicationError } from "./suppliers-application.error";

export class SupplierVariantNotFoundError extends SuppliersApplicationError {
  readonly code = "SUPPLIERS_APPLICATION_NOT_FOUND";
  readonly identifier = "SUPPLIER_VARIANT_NOT_FOUND";

  constructor() {
    super("Relacion proveedor-variante no encontrada");
  }
}
