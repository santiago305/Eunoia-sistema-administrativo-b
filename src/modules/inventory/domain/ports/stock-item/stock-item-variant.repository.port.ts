import { TransactionContext } from "src/shared/domain/ports/transaction-context.port";
import { StockItemVariant } from "../../entities/stock-item/stock-item-variant";


export const STOCK_ITEM_VARIANT_REPOSITORY = Symbol('STOCK_ITEM_VARIANT_REPOSITORY');

export interface StockItemVariantRepository {
  findByStockItemId(stockItemId: string, tx?: TransactionContext): Promise<StockItemVariant | null>;
  findByVariantId(variantId: string, tx?: TransactionContext): Promise<StockItemVariant | null>;
  create(link: StockItemVariant, tx?: TransactionContext): Promise<StockItemVariant>;
}
