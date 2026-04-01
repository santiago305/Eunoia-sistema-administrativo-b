import { InvalidQuantityError } from "../errors/invalid-quantity.error";

export class WastedQuantityError {
  private constructor (
    private readonly value: number,
  ){}
  static create(value?: number | null): WastedQuantityError {
    const v = value ?? 0;
    if (!Number.isFinite(v) || v < 0) {
      throw new InvalidQuantityError(v, "La merma no puede ser negativa");
    }
    return new WastedQuantityError(v);
  }

  getValue(): number {
    return this.value;
  }
}