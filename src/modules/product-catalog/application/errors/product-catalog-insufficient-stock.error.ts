import { ProductCatalogApplicationError } from "./product-catalog-application.error";

export class ProductCatalogInsufficientStockError extends ProductCatalogApplicationError {
  readonly code = "PRODUCT_CATALOG_APPLICATION_VALIDATION";
  readonly identifier = "PRODUCT_CATALOG_INSUFFICIENT_STOCK";

  constructor(message = "No hay stock suficiente en inventario SKU") {
    super(message);
  }
}
