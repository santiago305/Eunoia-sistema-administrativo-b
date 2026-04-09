import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { ProductCatalogInventoryBalance } from "../entities/inventory-balance";

export const PRODUCT_CATALOG_INVENTORY_REPOSITORY = Symbol("PRODUCT_CATALOG_INVENTORY_REPOSITORY");

export interface ProductCatalogInventoryRepository {
  getSnapshot(input: {
    warehouseId: string;
    stockItemId: string;
    locationId?: string | null;
  }, tx?: TransactionContext): Promise<ProductCatalogInventoryBalance | null>;
  listByStockItemId(stockItemId: string, tx?: TransactionContext): Promise<ProductCatalogInventoryBalance[]>;
  listBySkuId(skuId: string, tx?: TransactionContext): Promise<ProductCatalogInventoryBalance[]>;
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
