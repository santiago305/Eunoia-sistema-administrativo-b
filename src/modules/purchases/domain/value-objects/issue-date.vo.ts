import { InvalidIssueDateError } from "../errors/purchase-order.errors";

export class PurchaseIssueDate {
  static create(value: Date | string): Date {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new InvalidIssueDateError();
    }
    return date;
  }
}
