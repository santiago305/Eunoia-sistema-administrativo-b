import { TransactionContext } from 'src/shared/domain/ports/transaction-context.port';
import { StockItemType } from '../../value-objects/stock-item-type';
import { StockItem } from '../../entities/stock-item/stock-item';


export const STOCK_ITEM_REPOSITORY = Symbol('STOCK_ITEM_REPOSITORY');

export interface StockItemRepository {
  findById(stockItemId: string, tx?: TransactionContext): Promise<StockItem | null>;
  findByType(type: StockItemType, tx?: TransactionContext): Promise<StockItem[]>;
  create(stockItem: StockItem, tx?: TransactionContext): Promise<StockItem>;
  setActive(stockItemId: string, isActive: boolean, tx?: TransactionContext): Promise<void>;
}
