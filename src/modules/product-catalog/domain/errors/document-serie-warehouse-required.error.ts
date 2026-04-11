import { ProductCatalogDomainError } from "./product-catalog-domain.error";

export class DocumentSerieWarehouseRequiredError extends ProductCatalogDomainError {
  readonly code = "PRODUCT_CATALOG_DOMAIN_VALIDATION";
  readonly identifier = "PRODUCT_CATALOG_DOCUMENT_SERIE_WAREHOUSE_REQUIRED";

  constructor(message = "El almacen es obligatorio") {
    super(message);
  }
}
