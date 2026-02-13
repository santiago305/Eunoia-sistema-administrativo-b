import { ProductId } from '../value-object/product-id.vo';

export class Product {
  constructor(
    private readonly id: ProductId | undefined,
    private name: string,
    private description: string | null,
    private isActive: boolean = true,
    private readonly createdAt?: Date,
    private updatedAt?: Date,
  ) {
    if (!name?.trim()) throw new Error("Product name is required");
  }

  getId() { return this.id; }
  getName() { return this.name; }
  getDescription() { return this.description; }
  getIsActive() { return this.isActive; }
  getCreatedAt() { return this.createdAt; }
  getUpdatedAt() { return this.updatedAt; }
}
