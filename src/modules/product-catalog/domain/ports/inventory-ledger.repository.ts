import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { ProductCatalogInventoryLedgerEntry } from "../entities/inventory-ledger-entry";

export const PRODUCT_CATALOG_INVENTORY_LEDGER_REPOSITORY = Symbol("PRODUCT_CATALOG_INVENTORY_LEDGER_REPOSITORY");

export interface ProductCatalogInventoryLedgerRepository {
  append(entries: ProductCatalogInventoryLedgerEntry[], tx?: TransactionContext): Promise<void>;
  listByStockItemId(stockItemId: string, tx?: TransactionContext): Promise<ProductCatalogInventoryLedgerEntry[]>;
  updateWasteByDocItem(input: { docItemId: string; wasteQty: number }, tx?: TransactionContext): Promise<boolean>;
}
