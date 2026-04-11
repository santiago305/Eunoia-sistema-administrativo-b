import { ProductCatalogInfrastructureError } from "./product-catalog-infrastructure.error";

export class ProductCatalogInvalidTransactionContextError extends ProductCatalogInfrastructureError {
  readonly code = "PRODUCT_CATALOG_INFRASTRUCTURE_TRANSACTION";
  readonly identifier = "PRODUCT_CATALOG_INVALID_TRANSACTION_CONTEXT";

  constructor(message = "TransactionContext invalido") {
    super(message);
  }
}
