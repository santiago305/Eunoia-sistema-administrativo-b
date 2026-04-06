import { StockItem } from "../entities/stock-item/stock-item";
import { StockItemType } from "../value-objects/stock-item-type";

export class StockItemFactory {
  static create(params: {
    stockItemId?: string;
    type: StockItemType;
    isActive?: boolean;
    productId?: string;
    variantId?: string;
    createdAt?: Date;
  }): StockItem {
    return StockItem.create({
      stockItemId: params.stockItemId,
      type: params.type,
      isActive: params.isActive,
      productId: params.productId,
      variantId: params.variantId,
      createdAt: params.createdAt,
    });
  }
}
