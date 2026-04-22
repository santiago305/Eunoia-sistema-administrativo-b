import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { ProductCatalogInventoryBalance } from "../entities/inventory-balance";
import { ProductCatalogProductType } from "../value-objects/product-type";

export const PRODUCT_CATALOG_INVENTORY_REPOSITORY = Symbol("PRODUCT_CATALOG_INVENTORY_REPOSITORY");

export interface ProductCatalogInventorySnapshotSearchRow {
  stockItemId: string;
  skuId: string;
  warehouseId: string;
  warehouseName: string;
  locationId: string | null;
  onHand: number;
  reserved: number;
  available: number;
  updatedAt: Date;
}

export interface ProductCatalogInventoryRepository {
  getSnapshot(input: {
    warehouseId: string;
    stockItemId: string;
    locationId?: string | null;
  }, tx?: TransactionContext): Promise<ProductCatalogInventoryBalance | null>;
  listByStockItemId(stockItemId: string, tx?: TransactionContext): Promise<ProductCatalogInventoryBalance[]>;
  listBySkuId(skuId: string, tx?: TransactionContext): Promise<ProductCatalogInventoryBalance[]>;
  list(input: {
    warehouseId?: string;
    stockItemId?: string;
    locationId?: string | null;
  }, tx?: TransactionContext): Promise<ProductCatalogInventoryBalance[]>;
  searchSnapshots(input: {
    warehouseId?: string;
    warehouseIdsIn?: string[];
    warehouseIdsNotIn?: string[];
    q?: string;
    isActive?: boolean;
    skuId?: string;
    skuIdsIn?: string[];
    skuIdsNotIn?: string[];
    productType?: ProductCatalogProductType;
    page?: number;
    limit?: number;
  }, tx?: TransactionContext): Promise<{ items: ProductCatalogInventorySnapshotSearchRow[]; total: number }>;
  upsert(input: ProductCatalogInventoryBalance, tx?: TransactionContext): Promise<ProductCatalogInventoryBalance>;
  incrementOnHand(input: {
    warehouseId: string;
    stockItemId: string;
    locationId?: string | null;
    delta: number;
  }, tx?: TransactionContext): Promise<ProductCatalogInventoryBalance>;
  incrementReserved(input: {
    warehouseId: string;
    stockItemId: string;
    locationId?: string | null;
    delta: number;
  }, tx?: TransactionContext): Promise<ProductCatalogInventoryBalance>;
}
