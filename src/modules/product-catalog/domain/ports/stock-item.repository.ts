import { TransactionContext } from "src/shared/domain/ports/transaction-context.port";
import { ProductCatalogStockItem } from "../entities/stock-item";

export const PRODUCT_CATALOG_STOCK_ITEM_REPOSITORY = Symbol("PRODUCT_CATALOG_STOCK_ITEM_REPOSITORY");

export interface ProductCatalogStockItemRepository {
  create(input: ProductCatalogStockItem, tx?: TransactionContext): Promise<ProductCatalogStockItem>;
  findById(id: string, tx?: TransactionContext): Promise<ProductCatalogStockItem | null>;
  findBySkuId(skuId: string, tx?: TransactionContext): Promise<ProductCatalogStockItem | null>;
  setActive(id: string, isActive: boolean, tx?: TransactionContext): Promise<void>;
}
