import { ProductCatalogApplicationError } from "./product-catalog-application.error";

export class ProductCatalogDocumentSerieNotFoundError extends ProductCatalogApplicationError {
  readonly code = "PRODUCT_CATALOG_APPLICATION_NOT_FOUND";
  readonly identifier = "PRODUCT_CATALOG_DOCUMENT_SERIE_NOT_FOUND";

  constructor(message = "Serie de documento no encontrada") {
    super(message);
  }
}
