import type { ProductCatalogProductType } from "src/modules/product-catalog/domain/value-objects/product-type";
import type { InventoryLedgerSearchSnapshot } from "../inventory-ledger-search-snapshot";

export type SaveInventoryLedgerSearchMetricInput = {
  userId: string;
  name: string;
  productType?: ProductCatalogProductType;
  snapshot: InventoryLedgerSearchSnapshot;
};

