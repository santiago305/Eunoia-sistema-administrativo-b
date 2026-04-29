import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { ProductCatalogInventoryLedgerEntry } from "../entities/inventory-ledger-entry";
import { Direction } from "src/shared/domain/value-objects/direction";
import { ProductCatalogProductType } from "../value-objects/product-type";
import { ReferenceType } from "src/shared/domain/value-objects/reference-type";
import { DocType } from "src/shared/domain/value-objects/doc-type";

export const PRODUCT_CATALOG_INVENTORY_LEDGER_REPOSITORY = Symbol("PRODUCT_CATALOG_INVENTORY_LEDGER_REPOSITORY");

export interface ProductCatalogInventoryLedgerUnitRef {
  id: string;
  name: string;
  code: string;
}

export interface ProductCatalogInventoryLedgerSkuRef {
  id: string;
  productId: string;
  backendSku: string;
  customSku: string | null;
  name: string;
}

export interface ProductCatalogInventoryLedgerProductRef {
  id: string;
  name: string;
  type: ProductCatalogProductType;
  baseUnitId: string | null;
}

export interface ProductCatalogInventoryLedgerPurchaseReference {
  id: string;
  documentType: string | null;
  serie: string | null;
  correlative: number | null;
  status: string | null;
  dateIssue: Date | null;
  warehouseId: string | null;
  supplierId: string | null;
}

export interface ProductCatalogInventoryLedgerProductionReference {
  id: string;
  docType: string;
  serieId: string;
  correlative: number;
  status: string | null;
  reference: string | null;
  manufactureDate: Date | null;
  fromWarehouseId: string | null;
  toWarehouseId: string | null;
}

export type ProductCatalogInventoryLedgerReference =
  | { type: ReferenceType.PURCHASE; id: string; purchase: ProductCatalogInventoryLedgerPurchaseReference | null }
  | { type: ReferenceType.PRODUCTION; id: string; production: ProductCatalogInventoryLedgerProductionReference | null };

export interface ProductCatalogInventoryLedgerListItem {
  id: string;
  docId: string;
  docType: DocType;
  referenceId: string | null;
  referenceType: ReferenceType | null;
  reference: ProductCatalogInventoryLedgerReference | null;
  docItemId: string | null;
  warehouseId: string;
  skuId: string;
  direction: Direction;
  quantity: number;
  locationId: string | null;
  wasteQty: number | null;
  unitCost: number | null;
  createdAt: Date;
  sku: ProductCatalogInventoryLedgerSkuRef;
  product: ProductCatalogInventoryLedgerProductRef;
  baseUnit: ProductCatalogInventoryLedgerUnitRef | null;
}

export interface ProductCatalogInventoryLedgerMovementUserRef {
  id: string;
  name: string | null;
  email: string | null;
}

export interface ProductCatalogInventoryLedgerMovementListItem {
  id: string;
  createdAt: Date;
  quantity: number;
  direction: Direction;
  warehouseId: string;
  warehouseName: string | null;
  sku: ProductCatalogInventoryLedgerSkuRef;
  product: ProductCatalogInventoryLedgerProductRef;
  user: ProductCatalogInventoryLedgerMovementUserRef | null;
}

export interface ProductCatalogInventoryLedgerMovementListResult {
  items: ProductCatalogInventoryLedgerMovementListItem[];
  total: number;
}

export interface ProductCatalogInventoryLedgerRepository {
  append(entries: ProductCatalogInventoryLedgerEntry[], tx?: TransactionContext): Promise<void>;
  listByStockItemId(stockItemId: string, tx?: TransactionContext): Promise<ProductCatalogInventoryLedgerEntry[]>;
  list(
    params: { stockItemId: string; warehouseId?: string; from?: Date; toExclusive?: Date },
    tx?: TransactionContext,
  ): Promise<ProductCatalogInventoryLedgerListItem[]>;
  listMovementsPaged(
    params: {
      page: number;
      limit: number;
      productType?: ProductCatalogProductType;
      from?: Date;
      toExclusive?: Date;
      warehouseIdsIn?: string[];
      skuIdsIn?: string[];
      directionIn?: Direction[];
      userIdsIn?: string[];
      skuQuery?: string;
      q?: string;
    },
    tx?: TransactionContext,
  ): Promise<ProductCatalogInventoryLedgerMovementListResult>;
  updateWasteByDocItem(input: { docItemId: string; wasteQty: number }, tx?: TransactionContext): Promise<boolean>;
}
