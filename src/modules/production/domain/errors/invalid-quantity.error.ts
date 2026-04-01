import { DomainError } from "./domain.error";

export class InvalidQuantityError extends DomainError {
  readonly value: number;

  constructor(value: number, message = "Quantity must be greater than 0") {
    super(message);
    this.name = "InvalidQuantityError";
    this.value = value;
  }
}
