import { InvalidExpirationDateError } from "../errors/purchase-order.errors";

export class PurchaseExpirationDate {
  static create(value: Date | string): Date {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new InvalidExpirationDateError();
    }
    return date;
  }
}
