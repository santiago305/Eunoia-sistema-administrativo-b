import { DomainError } from "./domain.error";

export class InvalidManufactureDateError extends DomainError {
  constructor(message = "Invalid manufacture date") {
    super(message);
    this.name = "InvalidManufactureDateError";
  }
}
