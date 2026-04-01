import { InvalidPurchaseOrderItemIdError } from "../errors/item.errors";

export class PurchaseOrderItemId {
  public readonly value: string;

  constructor(value: string) {
    const normalized = value?.trim();
    if (!normalized) {
      throw new InvalidPurchaseOrderItemIdError();
    }
    this.value = normalized;
  }
}
