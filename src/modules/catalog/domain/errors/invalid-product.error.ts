import { CatalogDomainError } from "./catalog-domain.error";

export class InvalidProductError extends CatalogDomainError {
  readonly code = "CATALOG_DOMAIN_VALIDATION";
  readonly identifier = "INVALID_PRODUCT";

  constructor(message = "El producto es invalido") {
    super(message);
  }
}
