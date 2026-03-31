import { InvalidManufactureDateError } from "../errors/invalid-manufacture.error";

export class ManufactureDate {
  private constructor(private readonly value: Date) {}

  static create(value: Date): ManufactureDate {
    if (!value || Number.isNaN(value.getTime())) {
      throw new InvalidManufactureDateError("Ingrese una fecha de fabricación válida");
    }
    return new ManufactureDate(value);
  }

  assertNotFuture(now: Date): void {
    if (this.value.getTime() > now.getTime()) {
      throw new InvalidManufactureDateError("Debe ser una fecha futura");
    }
  }

  getValue(): Date {
    return this.value;
  }
}
