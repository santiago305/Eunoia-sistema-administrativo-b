import { InvalidIgvPercentageError } from "../errors/item.errors";

export class PurchaseIgvPercentage {
  public readonly value: number;

  private constructor(value: number) {
    this.value = value;
  }

  static create(value: number): PurchaseIgvPercentage {
    if (value === null || value === undefined) {
      throw new InvalidIgvPercentageError();
    }
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 100) {
      throw new InvalidIgvPercentageError();
    }
    return new PurchaseIgvPercentage(value);
  }
}
