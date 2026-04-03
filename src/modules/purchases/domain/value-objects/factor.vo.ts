import { InvalidPurchaseFactorError } from "../errors/item.errors";

export class PurchaseFactor {
  public readonly value: number;

  private constructor(value: number) {
    this.value = value;
  }

  static create(value: number): PurchaseFactor {
    if (value === null || value === undefined) {
      throw new InvalidPurchaseFactorError();
    }
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
      throw new InvalidPurchaseFactorError();
    }
    return new PurchaseFactor(value);
  }
}
