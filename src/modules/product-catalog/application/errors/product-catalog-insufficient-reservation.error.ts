import { ProductCatalogApplicationError } from "./product-catalog-application.error";

export class ProductCatalogInsufficientReservationError extends ProductCatalogApplicationError {
  readonly code = "PRODUCT_CATALOG_APPLICATION_VALIDATION";
  readonly identifier = "PRODUCT_CATALOG_INSUFFICIENT_RESERVATION";

  constructor(message = "Reserva SKU insuficiente") {
    super(message);
  }
}
