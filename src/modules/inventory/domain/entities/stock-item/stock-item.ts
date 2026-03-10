import { StockItemType } from '../../value-objects/stock-item-type';

export class StockItem {
  constructor(
    public readonly stockItemId: string | undefined,
    public readonly type: StockItemType,
    public readonly isActive: boolean = true,
    public readonly productId?: string | undefined,
    public readonly variantId?: string | undefined,
    public readonly createdAt?: Date,
  ) {}
}
