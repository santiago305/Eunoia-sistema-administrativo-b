import { ProductId } from '../value-object/product-id.vo';
import { ProductType } from '../value-object/productType';

export class Product {
  constructor(
    private readonly id: ProductId | undefined,
    private name: string,
    private description: string | null,
    private readonly baseUnitId: string,
    private isActive: boolean = true,
    private readonly variantDefaultId?:string | null,
    private readonly createdAt?: Date,
    private updatedAt?: Date,
    public readonly type?: ProductType
  ) {
    if (!name?.trim()) throw new Error("Product name is required");
  }

  getId() { return this.id; }
  getName() { return this.name; }
  getDescription() { return this.description; }
  getBaseUnitId() { return this.baseUnitId; }
  getVariantDefaultId() { return this.variantDefaultId; }
  getIsActive() { return this.isActive; }
  getCreatedAt() { return this.createdAt; }
  getUpdatedAt() { return this.updatedAt; }
  getType() { return this.type; }
}
