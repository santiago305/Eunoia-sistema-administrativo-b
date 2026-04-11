import { ProductCatalogApplicationError } from "./product-catalog-application.error";

export class ProductCatalogSkuNotFoundError extends ProductCatalogApplicationError {
  readonly code = "PRODUCT_CATALOG_APPLICATION_NOT_FOUND";
  readonly identifier = "PRODUCT_CATALOG_SKU_NOT_FOUND";

  constructor(message = "Sku not found") {
    super(message);
  }
}
