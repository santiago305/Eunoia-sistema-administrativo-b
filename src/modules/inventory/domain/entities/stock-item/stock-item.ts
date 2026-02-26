import { StockItemType } from '../../value-objects/stock-item-type';

export class StockItem {
  constructor(
    public readonly stockItemId: string,
    public readonly type: StockItemType,
    public readonly isActive: boolean = true,
    public readonly createdAt?: Date,
  ) {}
}
