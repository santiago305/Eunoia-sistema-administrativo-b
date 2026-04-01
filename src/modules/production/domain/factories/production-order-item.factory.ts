import { ProductionOrderItem } from "../entity/production-order-item";
import { Quantity } from "../value-objects/quantity.vo";
import { WastedQuantityError } from "../value-objects/wate-quantity.error.vo";

export class ProductionOrderItemFactory {
  static createNew(params: {
    productionId: string;
    finishedItemId: string;
    fromLocationId?: string | null;
    toLocationId?: string | null;
    quantity: number;
    unitCost: number;
    type?: string | null;
  }): ProductionOrderItem {
    const qty = Quantity.create(params.quantity);
    const waste = WastedQuantityError.create(0);

    return new ProductionOrderItem(
      undefined,
      params.productionId,
      params.finishedItemId,
      params.fromLocationId ?? null,
      params.toLocationId ?? null,
      qty.getValue(),
      waste.getValue(),
      params.unitCost,
      params.type ?? null
    );
  }

  static reconstitute(params: {
    productionItemId: string;
    productionId: string;
    finishedItemId: string;
    fromLocationId?: string | null;
    toLocationId?: string | null;
    quantity: number;
    wasteQty: number;
    unitCost: number;
    type?: string | null;
  }): ProductionOrderItem {
    return new ProductionOrderItem(
      params.productionItemId,
      params.productionId,
      params.finishedItemId,
      params.fromLocationId ?? null,
      params.toLocationId ?? null,
      params.quantity,
      params.wasteQty,
      params.unitCost,
      params.type ?? null
    );
  }
}
