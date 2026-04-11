import { ProductCatalogDomainError } from "./product-catalog-domain.error";

export class DocumentSerieUnavailableError extends ProductCatalogDomainError {
  readonly code = "PRODUCT_CATALOG_DOMAIN_CONFLICT";
  readonly identifier = "PRODUCT_CATALOG_DOCUMENT_SERIE_UNAVAILABLE";

  constructor(message = "Serie no encontrada o inactiva") {
    super(message);
  }
}
