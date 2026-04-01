import { TransactionContext } from 'src/shared/domain/ports/transaction-context.port';
import { StockItem } from '../../domain/entities/stock-item/stock-item';
import { StockItemType } from '../../domain/value-objects/stock-item-type';



export const STOCK_ITEM_REPOSITORY = Symbol('STOCK_ITEM_REPOSITORY');

export interface StockItemRepository {
  findById(stockItemId: string, tx?: TransactionContext): Promise<StockItem | null>;
  findByProductId(productId: string, tx?: TransactionContext): Promise<StockItem | null>;
  findByVariantId(variantId: string, tx?: TransactionContext): Promise<StockItem | null>;
  findByProductIdOrVariantId(itemId: string, tx?: TransactionContext): Promise<StockItem | null>;
  findByType(type: StockItemType, tx?: TransactionContext): Promise<StockItem[]>;
  create(stockItem: StockItem, tx?: TransactionContext): Promise<StockItem>;
  setActive(stockItemId: string, isActive: boolean, tx?: TransactionContext): Promise<void>;
}
