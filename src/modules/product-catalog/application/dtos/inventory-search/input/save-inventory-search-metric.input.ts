import type { ProductCatalogProductType } from "src/modules/product-catalog/domain/value-objects/product-type";
import type { InventorySearchSnapshot } from "../inventory-search-snapshot";

export type SaveInventorySearchMetricInput = {
  userId: string;
  name: string;
  productType?: ProductCatalogProductType;
  snapshot: InventorySearchSnapshot;
};
