import { ProductCatalogApplicationError } from "./product-catalog-application.error";

export class ProductCatalogStockItemNotFoundError extends ProductCatalogApplicationError {
  readonly code = "PRODUCT_CATALOG_APPLICATION_NOT_FOUND";
  readonly identifier = "PRODUCT_CATALOG_STOCK_ITEM_NOT_FOUND";

  constructor(message = "Stock item not found") {
    super(message);
  }
}
