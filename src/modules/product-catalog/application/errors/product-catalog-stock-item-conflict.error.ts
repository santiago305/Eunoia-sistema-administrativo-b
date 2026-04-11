import { ProductCatalogApplicationError } from "./product-catalog-application.error";

export class ProductCatalogStockItemConflictError extends ProductCatalogApplicationError {
  readonly code = "PRODUCT_CATALOG_APPLICATION_CONFLICT";
  readonly identifier = "PRODUCT_CATALOG_STOCK_ITEM_CONFLICT";

  constructor(message = "Stock item already exists for this sku") {
    super(message);
  }
}
