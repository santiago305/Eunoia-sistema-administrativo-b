import { ProductCatalogApplicationError } from "./product-catalog-application.error";

export class ProductCatalogProductNotFoundError extends ProductCatalogApplicationError {
  readonly code = "PRODUCT_CATALOG_APPLICATION_NOT_FOUND";
  readonly identifier = "PRODUCT_CATALOG_PRODUCT_NOT_FOUND";

  constructor(message = "Product not found") {
    super(message);
  }
}
