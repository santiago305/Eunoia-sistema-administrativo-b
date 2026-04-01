import { InvalidPurchaseStockItemIdError } from "../errors/item.errors";

export class PurchaseStockItemId {
  public readonly value: string;

  constructor(value: string) {
    const normalized = value?.trim();
    if (!normalized) {
      throw new InvalidPurchaseStockItemIdError();
    }
    this.value = normalized;
  }
}
