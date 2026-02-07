export class Quantity {
  readonly value: number;

  constructor(value: number) {
    if (!Number.isInteger(value) || value <= 0) {
      throw new Error('Cantidad inválida');
    }
    this.value = value;
  }
}
