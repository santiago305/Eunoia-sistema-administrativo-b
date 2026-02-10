import { Money } from "../value-object/money.vo";
import { ProductId } from "../value-object/product.vo";

export class ProductVar {
  constructor(
    public readonly id: string,
    private readonly product_id: ProductId,
    public readonly sku: string,
    public readonly barcode: string,
    public readonly attributes: string,
    public readonly price: Money,
    public readonly cost: Money,
    public readonly isActive: boolean,
    public readonly createdAt: Date,
  ) {}

  get productId(): ProductId {
    return this.product_id;
  }
}
