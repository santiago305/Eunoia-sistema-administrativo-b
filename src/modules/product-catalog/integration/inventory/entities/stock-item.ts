import { StockItemType } from "src/shared/domain/value-objects/stock-item-type";

export class StockItem {
  private constructor(
    public readonly stockItemId: string | undefined,
    public readonly type: StockItemType,
    public readonly isActive: boolean = true,
    public readonly productId?: string,
    public readonly createdAt?: Date,
  ) {}

  static create(params: {
    stockItemId?: string;
    type: StockItemType;
    isActive?: boolean;
    productId?: string;
    createdAt?: Date;
  }): StockItem {
    return new StockItem(
      params.stockItemId,
      params.type,
      params.isActive ?? true,
      params.productId,
      params.createdAt,
    );
  }
}
