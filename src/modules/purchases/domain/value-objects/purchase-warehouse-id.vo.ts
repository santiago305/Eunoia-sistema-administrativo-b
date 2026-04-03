import { InvalidPurchaseWarehouseIdError } from "../errors/purchase-order.errors";

export class PurchaseWarehouseId {
  public readonly value: string;

  constructor(value: string) {
    const normalized = value?.trim();
    if (!normalized) {
      throw new InvalidPurchaseWarehouseIdError();
    }
    this.value = normalized;
  }
}
