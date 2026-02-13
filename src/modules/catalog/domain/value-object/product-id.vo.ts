import { InvalidProductIdError } from "../errors/invalid-product-id.error";

export class ProductId {
  private static readonly UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  public readonly value: string;

  private constructor(value: string) {
    this.value = value;
    Object.freeze(this);
  }

  static create(raw: string | ProductId): ProductId {
    if (raw instanceof ProductId) return raw;

    const normalized = (raw ?? "").trim();

    if (!normalized) {
      throw new InvalidProductIdError("ProductId cannot be empty");
    }

    if (!ProductId.UUID_REGEX.test(normalized)) {
      throw new InvalidProductIdError("ProductId must be a valid UUID");
    }

    return new ProductId(normalized);
  }

  equals(other: ProductId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }

  toJSON(): string {
    return this.value;
  }
}
