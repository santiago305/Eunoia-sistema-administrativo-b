import { Money } from '../value-object/money.vo';
import { ProductId } from '../value-object/product-id.vo';

type VariantAttributes = Record<string, unknown>;

export class ProductVariant {
  constructor(
    private readonly id: string | undefined,
    private readonly productId: ProductId,
    public readonly sku: string,
    public readonly barcode: string | null,
    public readonly attributes: VariantAttributes,
    public readonly price: Money,
    public readonly cost: Money,
    public readonly isActive: boolean,
    public readonly createdAt: Date,
    private readonly defaultVariant: boolean,
  ) {
    if (!sku?.trim()) throw new Error("SKU is required");
  }

  getId(): string {
    if (!this.id) {
      throw new Error("ProductVariant id is not assigned");
    }
    return this.id;
  }
  getProductId(): ProductId { return this.productId; }
  getSku(): string { return this.sku; }
  getBarcode(): string | null { return this.barcode; }
  getAttributes(): VariantAttributes { return this.attributes; }
  getPrice(): Money { return this.price; }
  getCost(): Money { return this.cost; }
  getIsActive(): boolean { return this.isActive; }
  getCreatedAt(): Date { return this.createdAt; }
  getDefaultVariant(): boolean { return this.defaultVariant; }
}
