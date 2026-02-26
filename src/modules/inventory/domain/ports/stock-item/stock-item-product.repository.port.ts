import { TransactionContext } from "src/shared/domain/ports/transaction-context.port";
import { StockItemProduct } from "../../entities/stock-item/stock-item-product";


export const STOCK_ITEM_PRODUCT_REPOSITORY = Symbol('STOCK_ITEM_PRODUCT_REPOSITORY');

export interface StockItemProductRepository {
  findByStockItemId(stockItemId: string, tx?: TransactionContext): Promise<StockItemProduct | null>;
  findByProductId(productId: string, tx?: TransactionContext): Promise<StockItemProduct | null>;
  create(link: StockItemProduct, tx?: TransactionContext): Promise<StockItemProduct>;
}
