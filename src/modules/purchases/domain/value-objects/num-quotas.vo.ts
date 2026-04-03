import { InvalidNumQuotasError } from "../errors/purchase-order.errors";

export class PurchaseNumQuotas {
  public readonly value: number;

  private constructor(value: number) {
    this.value = value;
  }

  static create(value: number): PurchaseNumQuotas {
    if (value === null || value === undefined) {
      throw new InvalidNumQuotasError();
    }
    if (typeof value !== "number" || !Number.isFinite(value) || !Number.isInteger(value) || value < 0) {
      throw new InvalidNumQuotasError();
    }
    return new PurchaseNumQuotas(value);
  }
}
