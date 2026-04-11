import { ProductCatalogDomainError } from "./product-catalog-domain.error";

export class DocumentSerieCodeRequiredError extends ProductCatalogDomainError {
  readonly code = "PRODUCT_CATALOG_DOMAIN_VALIDATION";
  readonly identifier = "PRODUCT_CATALOG_DOCUMENT_SERIE_CODE_REQUIRED";

  constructor(message = "El codigo de serie es obligatorio") {
    super(message);
  }
}
