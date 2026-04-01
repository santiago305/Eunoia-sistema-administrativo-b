import { InvalidPurchaseSupplierIdError } from "../errors/purchase-order.errors";

export class PurchaseSupplierId {
  public readonly value: string;

  constructor(value: string) {
    const normalized = value?.trim();
    if (!normalized) {
      throw new InvalidPurchaseSupplierIdError();
    }
    this.value = normalized;
  }
}
