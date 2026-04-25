import type { ProductCatalogProductType } from "src/modules/product-catalog/domain/value-objects/product-type";

export type DeleteInventorySearchMetricInput = {
  userId: string;
  metricId: string;
  productType?: ProductCatalogProductType;
};
