import { ProductCatalogDomainError } from "./product-catalog-domain.error";

export class DocumentSerieNameRequiredError extends ProductCatalogDomainError {
  readonly code = "PRODUCT_CATALOG_DOMAIN_VALIDATION";
  readonly identifier = "PRODUCT_CATALOG_DOCUMENT_SERIE_NAME_REQUIRED";

  constructor(message = "El nombre de serie es obligatorio") {
    super(message);
  }
}
