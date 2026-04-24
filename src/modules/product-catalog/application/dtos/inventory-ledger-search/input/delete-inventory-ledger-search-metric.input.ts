import type { ProductCatalogProductType } from "src/modules/product-catalog/domain/value-objects/product-type";

export type DeleteInventoryLedgerSearchMetricInput = {
  userId: string;
  metricId: string;
  productType?: ProductCatalogProductType;
};

