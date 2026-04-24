import type { DocType } from "src/shared/domain/value-objects/doc-type";
import type { ProductCatalogProductType } from "src/modules/product-catalog/domain/value-objects/product-type";
import type { InventoryDocumentsSearchSnapshot } from "../inventory-documents-search-snapshot";

export interface SaveInventoryDocumentsSearchMetricInput {
  userId: string;
  name: string;
  docType: DocType;
  productType?: ProductCatalogProductType;
  snapshot: InventoryDocumentsSearchSnapshot;
}

