import { Money } from "src/shared/value-objets/money.vo";
import { PurchaseOrderItem } from "../entities/purchase-order-item";
import { AfectIgvType } from "../value-objects/afect-igv-type";
import { CurrencyType } from "../value-objects/currency-type";
import { PurchaseOrderIdRequiredError } from "../errors/item.errors";

export class PurchaseOrderItemFactory {
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
    if (!params.poId) {
      throw new PurchaseOrderIdRequiredError();
    }

    const currency = params.currency ?? CurrencyType.PEN;

    return new PurchaseOrderItem(
      undefined,
      params.poId,
      params.stockItemId,
      params.unitBase,
      params.equivalence,
      params.factor,
      params.afectType,
      params.quantity,
      Money.create(params.porcentageIgv ?? 0, currency),
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

    return new PurchaseOrderItem(
      params.poItemId,
      params.poId,
      params.stockItemId,
      params.unitBase,
      params.equivalence,
      params.factor,
      params.afectType,
      params.quantity,
      Money.create(params.porcentageIgv ?? 0, currency),
      Money.create(params.baseWithoutIgv ?? 0, currency),
      Money.create(params.amountIgv ?? 0, currency),
      Money.create(params.unitValue ?? 0, currency),
      Money.create(params.unitPrice ?? 0, currency),
      Money.create(params.purchaseValue ?? 0, currency),
    );
  }
}
