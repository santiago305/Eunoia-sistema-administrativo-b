import { InvalidPurchaseQuantityError } from "../errors/item.errors";

export class PurchaseQuantity {
  public readonly value: number;

  private constructor(value: number) {
    this.value = value;
  }

  static create(value: number): PurchaseQuantity {
    if (value === null || value === undefined) {
      throw new InvalidPurchaseQuantityError();
    }
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
      throw new InvalidPurchaseQuantityError();
    }
    return new PurchaseQuantity(value);
  }
}
