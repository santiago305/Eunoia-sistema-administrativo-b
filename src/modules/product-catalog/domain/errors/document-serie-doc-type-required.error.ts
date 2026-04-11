import { ProductCatalogDomainError } from "./product-catalog-domain.error";

export class DocumentSerieDocTypeRequiredError extends ProductCatalogDomainError {
  readonly code = "PRODUCT_CATALOG_DOMAIN_VALIDATION";
  readonly identifier = "PRODUCT_CATALOG_DOCUMENT_SERIE_DOC_TYPE_REQUIRED";

  constructor(message = "El tipo de documento es obligatorio") {
    super(message);
  }
}
