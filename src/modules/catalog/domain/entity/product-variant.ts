import { Money } from '../value-object/money.vo';
import { ProductId } from '../value-object/product-id.vo';
import { AttributesRecord } from '../value-object/variant-attributes.vo';
export class ProductVariant {
  constructor(
    private readonly id: string | undefined,
    private readonly productId: ProductId,
    private readonly sku: string,
    private readonly barcode: string | null,
    private readonly attributes: AttributesRecord,
    private readonly price: Money,
    private readonly cost: Money,
    private readonly isActive: boolean,
    private readonly createdAt: Date,
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
  getAttributes(): AttributesRecord { return this.attributes; }
  getPrice(): Money { return this.price; }
  getCost(): Money { return this.cost; }
  getIsActive(): boolean { return this.isActive; }
  getCreatedAt(): Date { return this.createdAt; }
}
