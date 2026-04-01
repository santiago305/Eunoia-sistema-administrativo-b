import { InvalidCreditDaysError } from "../errors/purchase-order.errors";

export class PurchaseCreditDays {
  public readonly value: number;

  private constructor(value: number) {
    this.value = value;
  }

  static create(value: number): PurchaseCreditDays {
    if (value === null || value === undefined) {
      throw new InvalidCreditDaysError();
    }
    if (typeof value !== "number" || !Number.isFinite(value) || !Number.isInteger(value) || value < 0) {
      throw new InvalidCreditDaysError();
    }
    return new PurchaseCreditDays(value);
  }
}
