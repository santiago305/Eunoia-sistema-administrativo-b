import { CatalogDomainError } from "./catalog-domain.error";

export class InvalidProductVariantError extends CatalogDomainError {
  readonly code = "CATALOG_DOMAIN_VALIDATION";
  readonly identifier = "INVALID_PRODUCT_VARIANT";

  constructor(message = "La variante es invalida") {
    super(message);
  }
}
