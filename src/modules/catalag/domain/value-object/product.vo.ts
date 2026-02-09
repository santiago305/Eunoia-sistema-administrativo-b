import { InvalidProductIdError } from '../errors/invalid-product-id.error';

export class ProductId {
  public readonly value: string;

  constructor(value: string) {
    const normalized = value?.trim();
    if (!normalized) {
      throw new InvalidProductIdError();
    }
    this.value = normalized;
  }
}
