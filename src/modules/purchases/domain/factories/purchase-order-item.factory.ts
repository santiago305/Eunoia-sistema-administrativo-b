import { Money } from "src/shared/value-objets/money.vo";
import { PurchaseOrderItem } from "../entities/purchase-order-item";
import { AfectIgvType } from "../value-objects/afect-igv-type";
import { CurrencyType } from "../value-objects/currency-type";
import { PurchaseOrderId } from "../value-objects/purchase-order-id.vo";
import { PurchaseOrderItemId } from "../value-objects/purchase-order-item-id.vo";
import { PurchaseStockItemId } from "../value-objects/purchase-stock-item-id.vo";
import { PurchaseQuantity } from "../value-objects/quantity.vo";
import { PurchaseFactor } from "../value-objects/factor.vo";
import { PurchaseIgvPercentage } from "../value-objects/igv-percentage.vo";

export class PurchaseOrderItemFactory {
  private static toNumber(value: number | Money | undefined | null): number {
    if (value instanceof Money) return value.getAmount();
    return value ?? 0;
  }

  static createNew(params: {
    poId: string;
    stockItemId: string;
    unitBase: string;
    equivalence: string;
    factor: number;
    afectType: AfectIgvType;
    quantity: number;
    porcentageIgv?: number | Money;
    baseWithoutIgv?: number | Money;
    amountIgv?: number | Money;
    unitValue?: number | Money;
    unitPrice?: number | Money;
    purchaseValue?: number | Money;
    currency?: CurrencyType;
  }): PurchaseOrderItem {
    const currency = params.currency ?? CurrencyType.PEN;
    const poId = new PurchaseOrderId(params.poId).value;
    const stockItemId = new PurchaseStockItemId(params.stockItemId).value;
    const quantity = PurchaseQuantity.create(params.quantity).value;
    const factor =
      params.factor === undefined || params.factor === null
        ? params.factor
        : PurchaseFactor.create(params.factor).value;
    const igvPercentage = PurchaseIgvPercentage.create(
      PurchaseOrderItemFactory.toNumber(params.porcentageIgv),
    ).value;

    return new PurchaseOrderItem(
      undefined,
      poId,
      stockItemId,
      params.unitBase,
      params.equivalence,
      factor as any,
      params.afectType,
      quantity,
      Money.create(igvPercentage, currency),
      Money.create(params.baseWithoutIgv ?? 0, currency),
      Money.create(params.amountIgv ?? 0, currency),
      Money.create(params.unitValue ?? 0, currency),
      Money.create(params.unitPrice ?? 0, currency),
      Money.create(params.purchaseValue ?? 0, currency),
    );
  }

  static reconstitute(params: {
    poItemId: string;
    poId: string;
    stockItemId: string;
    unitBase: string;
    equivalence: string;
    factor: number;
    afectType: AfectIgvType;
    quantity: number;
    porcentageIgv: number | Money;
    baseWithoutIgv: number | Money;
    amountIgv: number | Money;
    unitValue: number | Money;
    unitPrice: number | Money;
    purchaseValue: number | Money;
    currency?: CurrencyType;
  }): PurchaseOrderItem {
    const currency = params.currency ?? CurrencyType.PEN;
    const poItemId = new PurchaseOrderItemId(params.poItemId).value;
    const poId = new PurchaseOrderId(params.poId).value;
    const stockItemId = new PurchaseStockItemId(params.stockItemId).value;
    const quantity = PurchaseQuantity.create(params.quantity).value;
    const factor =
      params.factor === undefined || params.factor === null
        ? params.factor
        : PurchaseFactor.create(params.factor).value;
    const igvPercentage = PurchaseIgvPercentage.create(
      PurchaseOrderItemFactory.toNumber(params.porcentageIgv),
    ).value;

    return new PurchaseOrderItem(
      poItemId,
      poId,
      stockItemId,
      params.unitBase,
      params.equivalence,
      factor as any,
      params.afectType,
      quantity,
      Money.create(igvPercentage, currency),
      Money.create(params.baseWithoutIgv ?? 0, currency),
      Money.create(params.amountIgv ?? 0, currency),
      Money.create(params.unitValue ?? 0, currency),
      Money.create(params.unitPrice ?? 0, currency),
      Money.create(params.purchaseValue ?? 0, currency),
    );
  }
}
