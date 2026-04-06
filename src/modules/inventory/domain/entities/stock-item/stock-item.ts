import { StockItemType } from "../../value-objects/stock-item-type";

export class StockItem {
  private constructor(
    public readonly stockItemId: string | undefined,
    public readonly type: StockItemType,
    public readonly isActive: boolean = true,
    public readonly productId?: string | undefined,
    public readonly variantId?: string | undefined,
    public readonly createdAt?: Date,
  ) {}

  static create(params: {
    stockItemId?: string;
    type: StockItemType;
    isActive?: boolean;
    productId?: string;
    variantId?: string;
    createdAt?: Date;
  }): StockItem {
    return new StockItem(
      params.stockItemId,
      params.type,
      params.isActive ?? true,
      params.productId,
      params.variantId,
      params.createdAt,
    );
  }
}
