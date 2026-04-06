import { CatalogApplicationError } from "./catalog-application.error";

export class ProductVariantNotFoundApplicationError extends CatalogApplicationError {
  readonly code = "CATALOG_APPLICATION_NOT_FOUND";
  readonly identifier = "PRODUCT_VARIANT_NOT_FOUND";

  constructor() {
    super("Variante no encontrada");
  }
}
