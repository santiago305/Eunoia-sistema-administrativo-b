import { SuppliersApplicationError } from "./suppliers-application.error";

export class SupplierNotFoundError extends SuppliersApplicationError {
  readonly code = "SUPPLIERS_APPLICATION_NOT_FOUND";
  readonly identifier = "SUPPLIER_NOT_FOUND";

  constructor() {
    super("Proveedor no encontrado");
  }
}
