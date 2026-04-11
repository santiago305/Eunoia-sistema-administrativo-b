import { ProductCatalogInfrastructureError } from "./product-catalog-infrastructure.error";

export class ProductCatalogUnsupportedBridgeOperationError extends ProductCatalogInfrastructureError {
  readonly code = "PRODUCT_CATALOG_INFRASTRUCTURE_UNSUPPORTED_OPERATION";
  readonly identifier = "PRODUCT_CATALOG_UNSUPPORTED_BRIDGE_OPERATION";

  constructor(message: string) {
    super(message);
  }
}
