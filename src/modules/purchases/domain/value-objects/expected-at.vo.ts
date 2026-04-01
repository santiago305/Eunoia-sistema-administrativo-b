import { InvalidExpectedAtError } from "../errors/purchase-order.errors";

export class PurchaseExpectedAt {
  static create(value: Date | string): Date {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new InvalidExpectedAtError();
    }
    return date;
  }
}
