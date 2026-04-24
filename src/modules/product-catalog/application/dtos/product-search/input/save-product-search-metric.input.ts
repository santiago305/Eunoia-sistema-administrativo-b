import type { ProductCatalogProductSearchSnapshot } from "../product-search-snapshot";
import type { ProductCatalogProductType } from "src/modules/product-catalog/domain/value-objects/product-type";

export interface SaveProductCatalogProductSearchMetricInput {
  userId: string;
  type?: ProductCatalogProductType;
  name: string;
  snapshot: ProductCatalogProductSearchSnapshot;
}
