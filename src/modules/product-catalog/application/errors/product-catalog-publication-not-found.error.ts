import { ProductCatalogApplicationError } from "./product-catalog-application.error";

export class ProductCatalogPublicationNotFoundError extends ProductCatalogApplicationError {
  readonly code = "PRODUCT_CATALOG_APPLICATION_NOT_FOUND";
  readonly identifier = "PRODUCT_CATALOG_PUBLICATION_NOT_FOUND";

  constructor(message = "Publication not found") {
    super(message);
  }
}
