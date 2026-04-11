import { ProductCatalogApplicationError } from "./product-catalog-application.error";

export class ProductCatalogRecipeNotFoundError extends ProductCatalogApplicationError {
  readonly code = "PRODUCT_CATALOG_APPLICATION_NOT_FOUND";
  readonly identifier = "PRODUCT_CATALOG_RECIPE_NOT_FOUND";

  constructor(message = "Recipe not found") {
    super(message);
  }
}
