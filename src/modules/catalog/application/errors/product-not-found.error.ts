import { CatalogApplicationError } from "./catalog-application.error";

export class ProductNotFoundApplicationError extends CatalogApplicationError {
  readonly code = "CATALOG_APPLICATION_NOT_FOUND";
  readonly identifier = "PRODUCT_NOT_FOUND";

  constructor() {
    super("Producto no encontrado");
  }
}
